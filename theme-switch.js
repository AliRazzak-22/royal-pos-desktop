/* =====================================================================
   رويال — سويتش شكل النظام (ذهبي ⇄ زجاجي)
   لا يلمس أي منطق في app.js: يغيّر سمة data-theme فقط.
   الخلفية: صورة الملف bg.png (أو bg.jpg) بجانب index.html تُلتقط تلقائياً.
   ===================================================================== */
(function () {
    var THEME_KEY = 'royal_theme_v1';
    var root = document.documentElement;

    var get = function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
    var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

    var mode = function () { return get(THEME_KEY, 'gold') === 'noir' ? 'noir' : 'gold'; };

    /* ---------- صورة الخلفية: ملف ثابت بجانب النظام ---------- */
    var applyBg = function (url) {
        if (url) root.style.setProperty('--noir-bg-image', 'url("' + url + '")');
        else root.style.removeProperty('--noir-bg-image');
    };

    var BG_FILES = ['bg.jpg', 'bg.jpeg', 'bg.png', 'bg.webp', 'background.jpg', 'background.png'];
    var probe = function (i) {
        if (i >= BG_FILES.length) return;
        var src;
        try { src = new URL(BG_FILES[i], window.location.href).href; } catch (e) { return; }
        var img = new Image();
        img.onload = function () { applyBg(src); };
        img.onerror = function () { probe(i + 1); };
        img.src = src;
    };

    /* ---------- ضبط الوضع ---------- */
    var syncUI;
    var setTheme = function (next, quiet) {
        next = next === 'noir' ? 'noir' : 'gold';
        put(THEME_KEY, next);
        root.setAttribute('data-theme', next);
        if (syncUI) syncUI();
        if (!quiet && window.showAlert) {
            window.showAlert(next === 'noir' ? 'تم تفعيل الوضع الزجاجي ⬛' : 'تم الرجوع للوضع الذهبي 🟡', 'success');
        }
    };
    window.setRoyalTheme = setTheme;

    /* ---------- السويتش: تشغيل/إيقاف الزجاج ---------- */
    var makeCluster = function (extraClass) {
        var wrap = document.createElement('div');
        wrap.className = 'rsx' + (extraClass ? ' ' + extraClass : '');

        var sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'rsx-toggle';
        sw.setAttribute('role', 'switch');
        sw.title = 'الوضع الزجاجي — Ctrl+Shift+G';
        sw.innerHTML =
            '<i class="rsx-ic rsx-ic-a fa-solid fa-cube"></i>' +
            '<i class="rsx-ic rsx-ic-b fa-solid fa-sun"></i>' +
            '<span class="rsx-knob"></span>';
        sw.addEventListener('click', function () { setTheme(mode() === 'noir' ? 'gold' : 'noir'); });

        wrap.appendChild(sw);
        return wrap;
    };

    syncUI = function () {
        var m = mode();
        document.querySelectorAll('.rsx-toggle').forEach(function (b) {
            b.setAttribute('aria-checked', m === 'noir' ? 'true' : 'false');
        });
    };

    var mount = function () {
        var pos = document.querySelector('#pos-screen .top-bar');
        if (pos) {
            var actions = pos.lastElementChild;
            var host = (actions && actions.classList.contains('top-bar')) ? pos : actions;
            host.insertBefore(makeCluster('np-top'), (host === pos ? null : host.firstChild));
        }
        var side = document.querySelector('.admin-sidebar');
        if (side && side.firstElementChild) side.insertBefore(makeCluster('np-side'), side.firstElementChild.nextSibling);

        var main = document.getElementById('main-screen');
        if (main) main.appendChild(makeCluster('np-corner'));

        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
                e.preventDefault();
                setTheme(mode() === 'noir' ? 'gold' : 'noir');
            }
        });

        syncUI();
        probe(0);
    };

    root.setAttribute('data-theme', mode());
    if (mode() === 'noir') applyBg('bg.png');

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
