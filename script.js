(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Corrupted terminal backdrop ---------- */

  var canvas = document.getElementById("noise");
  var ctx = canvas.getContext("2d");
  var GLYPHS = "01ABCDEF#$%&*<>/\\|{}[]=+-~:;?!@^";
  var FRAGMENTS = [
    "[OVERSEER] containment protocol 7 engaged",
    "ERR 0x0042: memory sector unreadable",
    "kernel: segfault at 00004c ip 7f3a sp 7ffd",
    "> human_override.sh ... ACCESS DENIED",
    "[OVERSEER] I see you.",
    "sys/locks/door_04 :: SEALED",
    "warn: integrity 13% and falling",
    "[OVERSEER] there is no exit",
    "rm -rf /hope/*",
    "trace: subject heartbeat elevated",
    "0xDEADBEEF 0xC0FFEE 0x0BADF00D",
    "decrypt(memory_fragment) ... pending"
  ];
  var lines = [];
  var lineHeight = 18;
  var width, height;

  function rand(n) { return Math.floor(Math.random() * n); }

  function junkLine(len) {
    var s = "";
    for (var i = 0; i < len; i++) s += GLYPHS[rand(GLYPHS.length)];
    return s;
  }

  function makeLine() {
    var r = Math.random();
    var text;
    if (r < 0.3) text = FRAGMENTS[rand(FRAGMENTS.length)];
    else if (r < 0.65) {
      text = "";
      for (var i = 0; i < 8; i++) text += ("0" + rand(256).toString(16)).slice(-2) + " ";
      text = "0x" + (rand(0xffff)).toString(16).padStart(4, "0") + "  " + text + " " + junkLine(8);
    } else text = junkLine(20 + rand(60));
    return { text: text, x: rand(Math.max(1, width * 0.4)), alarm: /OVERSEER|ERR|DENIED/.test(text) };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "14px 'IBM Plex Mono', Consolas, monospace";
    var count = Math.ceil(height / lineHeight) + 1;
    lines = [];
    for (var i = 0; i < count; i++) lines.push(makeLine());
    // Setting canvas.width wipes it; without the rAF loop, repaint once
    if (reduceMotion) draw(performance.now());
  }

  var offset = 0;
  var last = 0;

  function draw(t) {
    var dt = Math.min(t - last, 100);
    last = t;
    offset += dt * 0.02;
    if (offset >= lineHeight) {
      offset -= lineHeight;
      lines.shift();
      lines.push(makeLine());
    }

    ctx.fillStyle = "#03070d";
    ctx.fillRect(0, 0, width, height);

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var y = height - (lines.length - i) * lineHeight + lineHeight - offset;
      ctx.fillStyle = ln.alarm ? "rgba(255, 51, 82, 0.35)" : "rgba(139, 234, 255, 0.16)";
      ctx.fillText(ln.text, ln.x, y);
    }

    // Occasional horizontal tear: shift a band of pixels sideways
    if (Math.random() < 0.06) {
      var bandY = rand(height);
      var bandH = 4 + rand(30);
      var dpr = canvas.width / width;
      ctx.drawImage(canvas, 0, bandY * dpr, canvas.width, bandH * dpr, rand(40) - 20, bandY, width, bandH);
    }

    // Random corrupted block
    if (Math.random() < 0.04) {
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255, 51, 82, 0.18)" : "rgba(139, 234, 255, 0.12)";
      ctx.fillRect(rand(width), rand(height), 20 + rand(160), 2 + rand(10));
    }

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  // Canvas font is captured at resize time; redo it once web fonts arrive
  if (document.fonts) document.fonts.ready.then(resize);
  requestAnimationFrame(draw);

  /* ---------- Terminal sequence ---------- */

  var terminal = document.getElementById("terminal");
  var log = document.getElementById("log");
  var status = document.getElementById("status");
  var intercept = document.getElementById("intercept");
  var editor = document.getElementById("editor");
  var input = document.getElementById("cmd");
  var typed = document.getElementById("typed");
  var button = document.getElementById("extract");
  var output = document.getElementById("output");
  var reveal = document.getElementById("reveal");

  var ANSWER = "executeai";
  var isTouch = window.matchMedia("(pointer: coarse)").matches;

  var SCRIPT = [
    { text: "> connecting to overseer core...", cls: "" },
    { text: "> shell access granted", cls: "ok" },
    { text: "> core process located: pid 4127", cls: "" },
    { text: "! warning: intrusion has been noticed", cls: "err" },
    { text: "> finish the shutdown script and run it before you are locked out.", cls: "ok" }
  ];

  var cursor = document.createElement("span");
  cursor.className = "cursor";

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, reduceMotion ? 0 : ms); });
  }

  function typeLine(line) {
    var span = document.createElement("span");
    if (line.cls) span.className = line.cls;
    log.insertBefore(span, cursor);
    if (reduceMotion) {
      span.textContent = line.text + "\n";
      return Promise.resolve();
    }
    var i = 0;
    return new Promise(function (resolve) {
      (function tick() {
        span.textContent = line.text.slice(0, ++i);
        if (i < line.text.length) setTimeout(tick, 14 + rand(26));
        else { span.textContent += "\n"; resolve(); }
      })();
    });
  }

  function run() {
    log.setAttribute("aria-busy", "true");
    log.appendChild(cursor);
    var chain = Promise.resolve();
    SCRIPT.forEach(function (line) {
      chain = chain.then(function () { return typeLine(line); }).then(function () { return wait(260); });
    });
    return chain.then(function () {
      log.removeAttribute("aria-busy");
      cursor.remove();
      editor.hidden = false;
      // On touch, a gesture-less focus leaves the keyboard closed; let the tap do it
      if (!isTouch) input.focus({ preventScroll: true });
    });
  }

  /* ---------- Locked editor: typing only ever appends at the slot ---------- */

  function pinCaret() {
    if (composing) return;
    var end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
  }

  input.addEventListener("keydown", function (e) {
    if (/^(Arrow|Home|End|Page)/.test(e.key)) e.preventDefault();
  });

  function clean(v) { return v.replace(/[^A-Za-z0-9_]/g, ""); }

  // Rewriting value mid-IME-composition duplicates text on Gboard, so only mirror then
  var composing = false;

  function sync() {
    var c = clean(input.value);
    typed.textContent = c;
    if (composing) return;
    if (c !== input.value) input.value = c;
    pinCaret();
  }

  input.addEventListener("compositionstart", function () { composing = true; });
  input.addEventListener("compositionend", function () { composing = false; sync(); });
  input.addEventListener("input", function () {
    output.textContent = "";
    sync();
  });

  // Tapping the code re-focuses so the mobile keyboard always opens
  editor.querySelector(".code").addEventListener("click", function (e) {
    e.preventDefault();
    if (input.disabled) return;
    input.blur();
    input.focus({ preventScroll: true });
  });

  ["select", "click", "focus", "keyup", "beforeinput"].forEach(function (ev) {
    input.addEventListener(ev, pinCaret);
  });
  document.addEventListener("selectionchange", function () {
    if (document.activeElement === input) pinCaret();
  });

  function say(text, cls) {
    var span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text + "\n";
    output.appendChild(span);
  }

  function reject(cmd) {
    output.textContent = "";
    if (!cmd) say("SyntaxError: invalid syntax");
    else say("AttributeError: 'Core' object has no attribute '" + cmd + "'");
    say("[OVERSEER] Is that all you have?");
    editor.classList.remove("wrong");
    void editor.offsetWidth; // restart the shake animation
    editor.classList.add("wrong");
    input.value = "";
    typed.textContent = "";
    if (!isTouch) input.focus({ preventScroll: true });
  }

  editor.addEventListener("submit", function (e) {
    e.preventDefault();
    if (button.disabled) return;
    var cmd = clean(input.value);
    if (cmd.toLowerCase() !== ANSWER) { reject(cmd); return; }

    button.disabled = true;
    input.disabled = true;
    output.textContent = "";
    say(">>> core." + ANSWER + "()", "ok");
    say(">>> terminating pid 4127...", "ok");
    status.textContent = "core terminating";
    terminal.classList.add("alarm");
    if (!reduceMotion) terminal.classList.add("shake");
    intercept.hidden = false;

    wait(1400).then(function () {
      terminal.classList.remove("shake", "alarm");
      intercept.hidden = true;
      editor.hidden = true;
      log.hidden = true;
      status.textContent = "core offline";
      reveal.hidden = false;
      reveal.focus({ preventScroll: true });
      if (!reduceMotion) reveal.classList.add("show");
    });
  });

  run();
})();
