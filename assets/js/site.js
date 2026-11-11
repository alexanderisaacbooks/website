/*
  Alexander Isaac: site settings and sign-up forms.

  THE GENRE LIST lives here. The line under the author's name and the tick
  boxes on every sign-up form are built from it. To add a genre:
    1. create a tag for it in Kit and add that tag to the Kit form's tag field;
    2. add one line below with the tag's number.

  label  = what the tick box says
  short  = the word used in the line under the name
  family = genres in the same family are grouped: "psychological and supernatural thrillers"
  tag    = the Kit tag number (Kit: Subscribers > the tag > the number in the web address)
*/
var SITE = {
  // The Kit form that every sign-up on the site goes through.
  kitFormId: 'KIT_FORM_ID',

  genres: [
    { id: 'scifi', label: 'Science fiction',         short: 'science fiction', tag: 'TAG_SCIFI' },
    { id: 'psych', label: 'Psychological thrillers', short: 'psychological', family: 'thrillers', tag: 'TAG_PSYCH' },
    { id: 'super', label: 'Supernatural thrillers',  short: 'supernatural',  family: 'thrillers', tag: 'TAG_SUPER' }
  ],

  // "Email me when it's out" for one particular book. Delete a line once that
  // book is out and its release email has gone.
  books: {
    'in-the-system':       { title: 'In The System',       tag: 'TAG_BOOK_ITS' },
    'handle-with-caution': { title: 'Handle With Caution', tag: 'TAG_BOOK_HWC' }
  }
};

(function () {
  'use strict';

  function joinList(words) {
    if (words.length < 2) return words.join('');
    return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
  }

  // "Science fiction, psychological and supernatural thrillers."
  function genreLine() {
    var parts = [], families = {};
    SITE.genres.forEach(function (g) {
      if (!g.family) { parts.push({ text: g.short }); return; }
      if (!families[g.family]) {
        families[g.family] = { family: g.family, members: [] };
        parts.push(families[g.family]);
      }
      families[g.family].members.push(g.short);
    });
    var texts = parts.map(function (p) {
      return p.members ? joinList(p.members) + ' ' + p.family : p.text;
    });
    var last = texts[texts.length - 1] || '';
    var line = (texts.length > 1 && last.indexOf(' and ') === -1) ? joinList(texts) : texts.join(', ');
    return line.charAt(0).toUpperCase() + line.slice(1);
  }

  function configured(v) { return v && !/^(KIT_|TAG_)/.test(String(v)); }

  document.querySelectorAll('[data-genre-line]').forEach(function (el) {
    var line = genreLine();
    el.textContent = el.hasAttribute('data-lowercase')
      ? line.charAt(0).toLowerCase() + line.slice(1)
      : line + (el.hasAttribute('data-no-stop') ? '' : '.');
  });

  var formCount = 0;
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    formCount++;
    var book = form.getAttribute('data-book');
    var bookInfo = book && SITE.books[book];

    // Send to Kit even if this script's fetch fails: a plain form post still works.
    form.action = 'https://app.kit.com/forms/' + SITE.kitFormId + '/subscriptions';
    form.method = 'post';

    // The book's own tag: the reader asked to hear about this book by pressing the button.
    if (bookInfo && configured(bookInfo.tag)) {
      var hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'tags[]'; hidden.value = bookInfo.tag;
      form.appendChild(hidden);
    }

    // Genre tick boxes, all unticked.
    var box = form.querySelector('[data-genres]');
    if (box) {
      SITE.genres.forEach(function (g) {
        var id = 'f' + formCount + '-' + g.id;
        var label = document.createElement('label');
        label.setAttribute('for', id);
        var input = document.createElement('input');
        input.type = 'checkbox'; input.id = id; input.name = 'tags[]'; input.value = g.tag;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + g.label));
        box.appendChild(label);
      });
    }

    var msg = form.querySelector('.msg');
    function say(text, kind) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'msg ' + (kind || '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type=email]');
      if (!email.value || !email.checkValidity()) {
        say('Please enter a valid email address.', 'error');
        email.focus();
        return;
      }
      var ticked = form.querySelectorAll('[data-genres] input:checked').length;
      if (!bookInfo && ticked === 0) {
        say('Please tick at least one genre, so I know which new books to tell you about.', 'error');
        var first = form.querySelector('[data-genres] input');
        if (first) first.focus();
        return;
      }
      // Honeypot: real people never see or fill this.
      var trap = form.querySelector('.hp input');
      if (trap && trap.value) return;

      if (!configured(SITE.kitFormId)) {
        say('Sign-up isn’t switched on yet. Please try again soon.', 'error');
        return;
      }

      var button = form.querySelector('button[type=submit]');
      if (button) button.disabled = true;
      say('Sending…');

      var data = new FormData(form);
      if (trap) data.delete(trap.name);

      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && (!res.j.status || res.j.status === 'success' || res.j.status === 'quarantined')) {
            form.classList.add('done');
            say('Nearly done: please check your inbox and click the link in the confirmation email.', 'ok');
          } else {
            if (button) button.disabled = false;
            var detail = res.j && res.j.errors && res.j.errors.messages ? ' ' + res.j.errors.messages.join(' ') : '';
            say('Sorry, that didn’t go through.' + detail + ' Please check the address and try again.', 'error');
          }
        })
        .catch(function () {
          // Browser blocked the background request: fall back to a normal form post.
          form.submit();
        });
    });
  });

  // Small "Email me when it's out" buttons that open the full form beside them.
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('data-open'));
    if (!target) return;
    btn.hidden = false;
    target.hidden = true;
    btn.addEventListener('click', function () {
      btn.hidden = true;
      target.hidden = false;
      var input = target.querySelector('input[type=email]');
      if (input) input.focus();
    });
  });
})();
