// ==UserScript==
// @name         自动复制选中文本和解除复制限制
// @name:zh-CN   自动复制选中文本和解除复制限制
// @name:zh-TW   自動複製選中文本和解除複製限制
// @name:en      Auto Copy Selected Text & Remove Copy Restrictions
// @name:ja      選択テキスト自動コピー＆コピー制限解除
// @name:ko      선택 텍스트 자동 복사 & 복사 제한 해제
// @description  选中文本自动复制，解除常见复制限制，支持文本/链接/HTML格式，并提供顶级动态玻璃悬浮面板
// @description:en   Auto-copy selected text, remove common copy restrictions, support Text / Link / HTML formats, and provide a holographic glass floating panel
// @description:ja   選択したテキストを自動コピーし、一般的なコピー制限を解除。テキスト／リンク／HTML形式に対応し、ホログラフィックガラスのフローティングパネルを提供します
// @description:zh-TW 選取文字自動複製，解除常見複製限制，支援文字／連結／HTML 格式，並提供炫彩玻璃懸浮面板
// @description:ko   선택한 텍스트를 자동 복사하고 일반적인 복사 제한을 해제하며, 텍스트/링크/HTML 형식을 지원하고 홀로그램 글래스 플로팅 패널을 제공합니다
// @author       lbihhe
// @license      MIT
// @version      6.5
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @namespace    http://tampermonkey.net/
// ==/UserScript==
 
(function () {
    'use strict';
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Config
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const CONFIG = {
        ENABLED: 'fusion_enabled',
        SHOW_BTN: 'fusion_show_btn',
        COPY_EDITABLE: 'fusion_copy_editable',
        SHOW_BUBBLE: 'fusion_show_bubble',
        FORMAT: 'fusion_format',
        POS_X: 'fusion_pos_x',
        POS_Y: 'fusion_pos_y',
        SITE_WHITELIST: 'fusion_site_whitelist',
        SITE_BLACKLIST: 'fusion_site_blacklist',
        SITE_MODE: 'fusion_site_mode',
    };
 
    const TUNE = {
        ENERGY_DECAY_MS: 2800,
        ENERGY_FLOOR: 0.008,
        COPY_DELAY_MS: 220,
        BUBBLE_SHOW_MS: 1800,
        BUBBLE_HIDE_CLEANUP_MS: 1900,
        SIGNATURE_COOLDOWN_MS: 26000,
        SIGNATURE_DURATION_MS: 700,
        PULSE_CLEANUP_MS: 420,
        PARTICLE_CAP: 50,
        RIPPLE_DURATION_MS: 600,
        FORMAT_FLIP_DURATION_MS: 260,
        STATE_SWAP_DELAY_MS: 95,
        STATE_SWAP_CLEANUP_MS: 500,
        DRAG_SUPPRESS_MS: 220,
        DRAG_THRESHOLD_PX: 4,
        DRAG_INERTIA_MS: 170,
        DRAG_MOMENTUM: 150,
        DRAG_EDGE_SNAP_PX: 24,
        DRAG_CARD_RESET_MS: 220,
        TILT_MAX_RX: 8,
        TILT_MAX_RY: 10,
        FORMAT_MAGNET_RANGE: 120,
        FORMAT_MAGNET_PULL: 5,
        SITE_PATTERN_MAX_LEN: 256,
        FROST_COUNT: 6,
        LIGHT_RAY_COUNT: 3,
    };
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Site filter
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const SITE_MODE = { OFF: 'off', WHITELIST: 'whitelist', BLACKLIST: 'blacklist' };
 
    function matchSitePattern(pattern, host) {
        if (pattern === '*') return true;
        if (pattern.length > TUNE.SITE_PATTERN_MAX_LEN) return false;
        const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        try { return new RegExp(`^${esc}$`, 'i').test(host); } catch (_) { return false; }
    }
 
    function isSiteAllowed() {
        const mode = GM_getValue(CONFIG.SITE_MODE, SITE_MODE.OFF);
        if (mode === SITE_MODE.OFF) return true;
        const host = location.hostname;
        if (mode === SITE_MODE.WHITELIST) {
            const list = GM_getValue(CONFIG.SITE_WHITELIST, '');
            return list.split('\n').filter(Boolean).some(p => matchSitePattern(p.trim(), host));
        }
        if (mode === SITE_MODE.BLACKLIST) {
            const list = GM_getValue(CONFIG.SITE_BLACKLIST, '');
            return !list.split('\n').filter(Boolean).some(p => matchSitePattern(p.trim(), host));
        }
        return true;
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Locale
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const LOCALES = {
        zh: {
            on: '已解锁', off: '已停用',
            subOn: '自动复制 & 解除限制', subOff: '点击启用',
            toast: '已复制到剪贴板', toastFail: '复制失败',
            menuToggle: '切换功能启用/停用',
            menuBtn: '切换按钮显示',
            menuEditable: '切换输入框内自动复制',
            menuBubble: '切换复制提示显示',
            menuFormat: (f) => `切换复制格式（当前：${f}）`,
            formatToast: (f) => `格式 → ${f}`,
            formatTitle: '切换复制格式',
            menuSiteMode: (m) => `站点过滤模式: ${m}`,
            menuSiteWhitelist: '编辑白名单',
            menuSiteBlacklist: '编辑黑名单',
            siteModeToast: (m) => `站点过滤 → ${m}`,
            siteListPromptTitle: '站点过滤列表',
            siteListPromptMsg: '输入主机名模式（每行一个，* 为通配符）:',
            shortcutToggle: '快捷键: Ctrl+Shift+X 切换开关',
        },
        en: {
            on: 'Unlocked', off: 'Disabled',
            subOn: 'Auto-copy & restrictions lifted', subOff: 'Click to enable',
            toast: 'Copied to clipboard', toastFail: 'Copy failed',
            menuToggle: 'Toggle Enable/Disable',
            menuBtn: 'Toggle Button Visibility',
            menuEditable: 'Toggle Auto-copy in Editable Fields',
            menuBubble: 'Toggle Copy Feedback',
            menuFormat: (f) => `Cycle Copy Format (current: ${f})`,
            formatToast: (f) => `Format → ${f}`,
            formatTitle: 'Cycle copy format',
            menuSiteMode: (m) => `Site Filter Mode: ${m}`,
            menuSiteWhitelist: 'Edit Site Whitelist',
            menuSiteBlacklist: 'Edit Site Blacklist',
            siteModeToast: (m) => `Site Filter → ${m}`,
            siteListPromptTitle: 'Site Filter List',
            siteListPromptMsg: 'Enter host patterns (one per line, * = wildcard):',
            shortcutToggle: 'Keyboard shortcut: Ctrl+Shift+X to toggle',
        },
        ja: {
            on: '有効', off: '無効',
            subOn: '自動コピー & 制限解除', subOff: 'クリックで有効化',
            toast: 'クリップボードにコピー済み', toastFail: 'コピー失敗',
            menuToggle: '有効/無効を切り替え',
            menuBtn: 'ボタン表示を切り替え',
            menuEditable: '入力欄内の自動コピーを切り替え',
            menuBubble: 'コピー通知の表示を切り替え',
            menuFormat: (f) => `コピー形式切替（現在：${f}）`,
            formatToast: (f) => `形式 → ${f}`,
            formatTitle: 'コピー形式を切替',
            menuSiteMode: (m) => `サイトフィルターモード: ${m}`,
            menuSiteWhitelist: 'ホワイトリストを編集',
            menuSiteBlacklist: 'ブラックリストを編集',
            siteModeToast: (m) => `サイトフィルター → ${m}`,
            siteListPromptTitle: 'サイトフィルターリスト',
            siteListPromptMsg: 'ホストパターンを入力（1行1パターン、* = ワイルドカード）:',
            shortcutToggle: 'ショートカット: Ctrl+Shift+X で切り替え',
        },
        ko: {
            on: '활성화됨', off: '비활성화됨',
            subOn: '자동 복사 & 제한 해제', subOff: '클릭하여 활성화',
            toast: '클립보드에 복사됨', toastFail: '복사 실패',
            menuToggle: '기능 켜기/끄기',
            menuBtn: '버튼 표시 토글',
            menuEditable: '입력란 자동 복사 토글',
            menuBubble: '복사 알림 표시 토글',
            menuFormat: (f) => `복사 형식 전환 (현재: ${f})`,
            formatToast: (f) => `형식 → ${f}`,
            formatTitle: '복사 형식 전환',
            menuSiteMode: (m) => `사이트 필터 모드: ${m}`,
            menuSiteWhitelist: '화이트리스트 편집',
            menuSiteBlacklist: '블랙리스트 편집',
            siteModeToast: (m) => `사이트 필터 → ${m}`,
            siteListPromptTitle: '사이트 필터 목록',
            siteListPromptMsg: '호스트 패턴 입력 (한 줄에 하나, * = 와일드카드):',
            shortcutToggle: '단축키: Ctrl+Shift+X로 전환',
        }
    };
 
    function resolveLocale() {
        const lang = (navigator.language || 'en').toLowerCase();
        if (lang.startsWith('zh')) return LOCALES.zh;
        if (lang.startsWith('ja')) return LOCALES.ja;
        if (lang.startsWith('ko')) return LOCALES.ko;
        return LOCALES.en;
    }
    const t = resolveLocale();
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Reduced motion
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let _prefersReduced = false;
    try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        _prefersReduced = mq.matches;
        mq.addEventListener('change', e => { _prefersReduced = e.matches; });
    } catch (_) {}
    const prefersReduced = () => _prefersReduced;
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // State
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let isEnabled = GM_getValue(CONFIG.ENABLED, true);
    let showBtn = GM_getValue(CONFIG.SHOW_BTN, true);
    let copyInEditable = GM_getValue(CONFIG.COPY_EDITABLE, false);
    let showCopyBubble = GM_getValue(CONFIG.SHOW_BUBBLE, true);
    let copyFormat = GM_getValue(CONFIG.FORMAT, 'text');
    const FORMAT_CYCLE = ['text', 'link', 'html'];
    const FORMAT_LABELS = { text: 'TXT', link: 'URL', html: 'HTML' };
    const FORMAT_ICONS = { text: '¶', link: '⌁', html: '</>' };
 
    let panel = null;
    let panelMounted = false;
    let bubbleTimer = null;
    let bubbleHideTimer = null;
    let copyTimer = null;
    let mouseDownEditableTarget = null;
    let energyRAF = 0;
    let lastEnergyTs = 0;
    let energy = isEnabled ? 0.22 : 0.08;
    let successCount = 0;
    let lastSignatureTs = 0;
    let activeController = null;
 
    const ui = {
        card: null, orbWrap: null, orb: null,
        label: null, sub: null,
        formatBtn: null, formatIcon: null, formatText: null,
        bubble: null, fxLayer: null, signatureLine: null,
        lightRays: null, frostLayer: null, glowOrb: null,
        grainOverlay: null,
    };
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ╔═══════════════════════════════════════╗
    // ║         WORLD-CLASS UI STYLES         ║
    // ╚═══════════════════════════════════════╝
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    GM_addStyle(`
 
    /* ═══════════════ DESIGN TOKENS ═══════════════ */
    :root {
        --A50: 255,251,235;
        --A100: 254,243,199;
        --A200: 253,230,138;
        --A300: 252,211,77;
        --A400: 251,191,36;
        --A500: 245,158,11;
        --A600: 217,119,6;
        --A700: 180,83,9;
        --A800: 146,64,14;
        --A900: 120,53,15;
 
        --S400: 148,163,184;
        --S500: 100,116,139;
        --S600: 71,85,105;
        --S700: 51,65,85;
 
        --OK: 34,197,94;
        --ERR: 239,68,68;
        --INFO: 59,130,246;
 
        --GLASS-BG: rgba(255,255,255,0.72);
        --GLASS-BG-HOVER: rgba(255,255,255,0.82);
        --GLASS-BORDER: rgba(255,255,255,0.45);
        --GLASS-BORDER-INNER: rgba(255,255,255,0.6);
 
        --SHADOW-SOFT: 0 8px 32px rgba(2,6,23,0.08), 0 2px 8px rgba(2,6,23,0.04);
        --SHADOW-MEDIUM: 0 16px 48px rgba(2,6,23,0.12), 0 4px 12px rgba(2,6,23,0.06);
        --SHADOW-DEEP: 0 24px 64px rgba(2,6,23,0.16), 0 8px 20px rgba(2,6,23,0.08);
        --SHADOW-GLOW-AMBER: 0 0 40px rgba(var(--A400),0.15), 0 0 80px rgba(var(--A400),0.06);
        --SHADOW-GLOW-AMBER-ON: 0 0 40px rgba(var(--A400),0.25), 0 0 80px rgba(var(--A400),0.10);
 
        --FONT-SANS: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;
        --FONT-MONO: "SF Mono", "Fira Code", "JetBrains Mono", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
 
        --T-INSTANT: 80ms;
        --T-FAST: 150ms;
        --T-BASE: 240ms;
        --T-SMOOTH: 360ms;
        --T-SLOW: 520ms;
        --T-VERY-SLOW: 800ms;
 
        --E-OUT: cubic-bezier(0.16, 1, 0.3, 1);
        --E-IN-OUT: cubic-bezier(0.45, 0, 0.55, 1);
        --E-SPRING: cubic-bezier(0.34, 1.56, 0.64, 1);
        --E-SNAP: cubic-bezier(0.2, 0.8, 0.2, 1);
        --E-BOUNCE: cubic-bezier(0.34, 1.4, 0.64, 1);
    }
 
    /* ═══════════════ KEYFRAMES ═══════════════ */
 
    @keyframes panel-enter {
        0%   { opacity: 0; transform: translateY(24px) scale(0.88) rotateX(8deg); filter: blur(8px); }
        50%  { opacity: 0.8; transform: translateY(-4px) scale(1.02) rotateX(-1deg); filter: blur(0px); }
        70%  { transform: translateY(2px) scale(0.995) rotateX(0.5deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); filter: blur(0px); }
    }
 
    @keyframes border-rotate { to { transform: rotate(360deg); } }
 
    @keyframes ambient-breathe {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50%      { opacity: 0.65; transform: scale(1.08); }
    }
 
    @keyframes orb-energy-pulse {
        0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--A400),0.4); }
        50%  { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(var(--A400),0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--A400),0); }
    }
 
    @keyframes orb-kick {
        0%   { transform: scale(1) rotate(0deg); }
        20%  { transform: scale(0.9) rotate(-8deg); }
        50%  { transform: scale(1.18) rotate(4deg); }
        70%  { transform: scale(1.04) rotate(-2deg); }
        100% { transform: scale(1) rotate(0deg); }
    }
 
    @keyframes ring-expand {
        0%   { transform: scale(0.5); opacity: 0.6; border-width: 2px; }
        100% { transform: scale(2.8); opacity: 0; border-width: 0.5px; }
    }
 
    @keyframes ripple-wave {
        from { transform: scale(0); opacity: 0.3; }
        to   { transform: scale(1); opacity: 0; }
    }
 
    @keyframes ripple-chromatic {
        0%   { transform: scale(0.1); opacity: 0.5; filter: blur(0px); }
        100% { transform: scale(1); opacity: 0; filter: blur(2px); }
    }
 
    @keyframes bubble-enter-ok {
        0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.92); filter: blur(4px); }
        60%  { opacity: 1; transform: translateX(-50%) translateY(-2px) scale(1.02); filter: blur(0); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: blur(0); }
    }
 
    @keyframes bubble-enter-err {
        0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.92); filter: blur(4px); }
        40%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.02); filter: blur(0); }
        50%  { transform: translateX(calc(-50% - 5px)) scale(1); }
        60%  { transform: translateX(calc(-50% + 4px)) scale(1); }
        70%  { transform: translateX(calc(-50% - 3px)) scale(1); }
        80%  { transform: translateX(calc(-50% + 2px)) scale(1); }
        100% { transform: translateX(-50%) scale(1); }
    }
 
    @keyframes bubble-exit {
        from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: blur(0); }
        to   { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.96); filter: blur(3px); }
    }

    @keyframes bubble-enter-standalone-ok {
        0%   { opacity: 0; transform: translateY(10px) scale(0.92); filter: blur(4px); }
        60%  { opacity: 1; transform: translateY(-2px) scale(1.02); filter: blur(0); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    @keyframes bubble-enter-standalone-err {
        0%   { opacity: 0; transform: translateY(10px) scale(0.92); filter: blur(4px); }
        40%  { opacity: 1; transform: translateY(0) scale(1.02); filter: blur(0); }
        50%  { transform: translateX(-5px) scale(1); }
        60%  { transform: translateX(4px) scale(1); }
        70%  { transform: translateX(-3px) scale(1); }
        80%  { transform: translateX(2px) scale(1); }
        100% { transform: translateX(0) scale(1); }
    }

    @keyframes bubble-exit-standalone {
        from { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        to   { opacity: 0; transform: translateY(-6px) scale(0.96); filter: blur(3px); }
    }
 
    @keyframes text-out-up {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(-6px); }
    }
 
    @keyframes text-in-up {
        from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
        to   { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
 
    @keyframes icon-flip-in {
        0%   { transform: scale(0.3) rotateY(90deg); opacity: 0; }
        60%  { transform: scale(1.1) rotateY(-8deg); opacity: 1; }
        100% { transform: scale(1) rotateY(0deg); opacity: 1; }
    }
 
    @keyframes text-slide-in {
        from { transform: translateY(6px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
    }
 
    @keyframes particle-fly {
        0%   { opacity: 0; transform: translate(0, 0) scale(1); }
        8%   { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(var(--ps)); }
    }
 
    @keyframes light-sweep {
        0%   { transform: translateX(-180%) skewX(-12deg); opacity: 0; }
        12%  { opacity: 0.7; }
        100% { transform: translateX(280%) skewX(-12deg); opacity: 0; }
    }
 
    @keyframes light-ray-drift {
        0%   { transform: rotate(var(--ray-angle)) translateY(-20%); opacity: 0.03; }
        50%  { transform: rotate(var(--ray-angle)) translateY(20%); opacity: 0.06; }
        100% { transform: rotate(var(--ray-angle)) translateY(-20%); opacity: 0.03; }
    }
 
    @keyframes frost-float {
        0%, 100% { transform: translate(0, 0); }
        25%      { transform: translate(var(--fx1), var(--fy1)); }
        50%      { transform: translate(var(--fx2), var(--fy2)); }
        75%      { transform: translate(var(--fx3), var(--fy3)); }
    }
 
    @keyframes status-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50%      { transform: scale(1.4); opacity: 0.6; }
    }
 
    @keyframes grain-shift {
        0%   { transform: translate(0, 0); }
        10%  { transform: translate(-2%, -3%); }
        20%  { transform: translate(3%, 1%); }
        30%  { transform: translate(-1%, 2%); }
        40%  { transform: translate(2%, -2%); }
        50%  { transform: translate(-3%, 3%); }
        60%  { transform: translate(1%, -1%); }
        70%  { transform: translate(-2%, 2%); }
        80%  { transform: translate(3%, -3%); }
        90%  { transform: translate(-1%, 1%); }
        100% { transform: translate(0, 0); }
    }
 
    /* ═══════════════ PANEL ROOT ═══════════════ */
    #lf-panel-root {
        all: initial !important;
        position: fixed !important;
        bottom: 28px !important;
        right: 28px !important;
        z-index: 2147483647 !important;
        user-select: none !important;
        font-family: var(--FONT-SANS) !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        animation: panel-enter var(--T-SLOW) var(--E-OUT) both !important;
        perspective: 1200px !important;
        transform-style: preserve-3d !important;
    }
 
    #lf-panel-root.lf-dragging { cursor: grabbing !important; }
 
    /* ═══════════════ CARD ═══════════════ */
    .lf-card {
        position: relative !important;
        display: grid !important;
        grid-template-columns: 34px 1fr auto !important;
        align-items: center !important;
        gap: 14px !important;
        min-width: 224px !important;
        padding: 14px 16px !important;
        border-radius: 20px !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transform-style: preserve-3d !important;
        isolation: isolate !important;
 
        --lf-rx: 0deg;
        --lf-ry: 0deg;
        --lf-hx: 50%;
        --lf-hy: 18%;
        --lf-energy: 0.12;
        --lf-mx: 0px;
        --lf-my: 0px;
        --lf-dsx: 1;
        --lf-dsy: 1;
        --lf-spin-dur: 6s;
 
        transform:
            rotateX(var(--lf-rx))
            rotateY(var(--lf-ry))
            scale3d(var(--lf-dsx), var(--lf-dsy), 1)
            translateZ(0) !important;
 
        transition:
            transform var(--T-FAST) var(--E-OUT),
            box-shadow var(--T-SMOOTH) var(--E-SNAP),
            filter var(--T-SMOOTH) var(--E-SNAP),
            background var(--T-SMOOTH) var(--E-SNAP) !important;
 
        background:
            radial-gradient(ellipse 80% 50% at var(--lf-hx) 0%,
                rgba(255,255,255,0.9) 0%,
                rgba(255,255,255,0.3) 40%,
                transparent 70%),
            radial-gradient(ellipse 60% 60% at 70% 80%,
                rgba(var(--A200), calc(0.06 + var(--lf-energy)*0.12)) 0%,
                transparent 60%),
            radial-gradient(ellipse 60% 50% at 20% 30%,
                rgba(230,237,255,0.5) 0%,
                transparent 60%),
            linear-gradient(135deg,
                rgba(255,255,255,0.85) 0%,
                rgba(248,250,255,0.78) 50%,
                rgba(241,245,249,0.82) 100%) !important;
 
        border: 1px solid var(--GLASS-BORDER) !important;
        box-shadow: var(--SHADOW-MEDIUM), var(--SHADOW-GLOW-AMBER) !important;
        backdrop-filter: blur(24px) saturate(1.6) brightness(1.02) !important;
        -webkit-backdrop-filter: blur(24px) saturate(1.6) brightness(1.02) !important;
    }
 
    .lf-card:hover {
        background:
            radial-gradient(ellipse 80% 50% at var(--lf-hx) 0%,
                rgba(255,255,255,0.95) 0%,
                rgba(255,255,255,0.4) 40%,
                transparent 70%),
            radial-gradient(ellipse 60% 60% at 70% 80%,
                rgba(var(--A200), calc(0.08 + var(--lf-energy)*0.14)) 0%,
                transparent 60%),
            radial-gradient(ellipse 60% 50% at 20% 30%,
                rgba(230,237,255,0.55) 0%,
                transparent 60%),
            linear-gradient(135deg,
                rgba(255,255,255,0.90) 0%,
                rgba(248,250,255,0.84) 50%,
                rgba(241,245,249,0.86) 100%) !important;
        box-shadow: var(--SHADOW-DEEP), var(--SHADOW-GLOW-AMBER-ON) !important;
    }
 
    .lf-card.lf-off { filter: saturate(0.7) brightness(0.97) !important; }
    .lf-card.lf-off:hover { filter: saturate(0.8) brightness(0.99) !important; }
 
    /* ── Layer: Rotating luminous border ── */
    .lf-card::before {
        content: "" !important;
        position: absolute !important;
        inset: -2px !important;
        border-radius: inherit !important;
        padding: 2px !important;
        background: conic-gradient(
            from 0deg,
            rgba(var(--A300), calc(0.0 + var(--lf-energy)*0.35)),
            rgba(var(--A200), calc(0.0 + var(--lf-energy)*0.15)) 15%,
            rgba(255,255,255, 0.06) 25%,
            rgba(var(--A400), calc(0.0 + var(--lf-energy)*0.25)) 40%,
            rgba(180,200,255, calc(0.0 + var(--lf-energy)*0.2)) 55%,
            rgba(255,255,255, 0.04) 65%,
            rgba(var(--A300), calc(0.0 + var(--lf-energy)*0.3)) 80%,
            rgba(var(--A200), calc(0.0 + var(--lf-energy)*0.2)) 90%,
            rgba(var(--A300), calc(0.0 + var(--lf-energy)*0.35))
        ) !important;
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) !important;
        -webkit-mask-composite: xor !important;
        mask-composite: exclude !important;
        animation: border-rotate var(--lf-spin-dur) linear infinite !important;
        pointer-events: none !important;
        z-index: 0 !important;
        transition: opacity var(--T-SMOOTH) var(--E-SNAP) !important;
    }
 
    /* ── Layer: Ambient specular reflection ── */
    .lf-card::after {
        content: "" !important;
        position: absolute !important;
        inset: -40% !important;
        background:
            radial-gradient(circle 120px at var(--lf-hx) var(--lf-hy),
                rgba(255,255,255,0.22) 0%,
                rgba(255,255,255,0.06) 30%,
                transparent 60%),
            radial-gradient(ellipse 50% 40% at 75% 90%,
                rgba(var(--A300), calc(0.08 + var(--lf-energy)*0.18)) 0%,
                transparent 60%),
            radial-gradient(ellipse 40% 30% at 15% 10%,
                rgba(180,200,255, calc(0.06 + var(--lf-energy)*0.1)) 0%,
                transparent 50%) !important;
        filter: blur(16px) !important;
        mix-blend-mode: screen !important;
        pointer-events: none !important;
        z-index: 0 !important;
        transition: background var(--T-INSTANT) linear !important;
    }
 
    /* ── Layer: Grain texture ── */
    .lf-grain {
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        opacity: 0.025 !important;
        pointer-events: none !important;
        z-index: 1 !important;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") !important;
        background-size: 128px 128px !important;
        animation: grain-shift 0.8s steps(4) infinite !important;
        mix-blend-mode: overlay !important;
    }
 
    /* ── Layer: Light rays ── */
    .lf-light-rays {
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        overflow: hidden !important;
        pointer-events: none !important;
        z-index: 0 !important;
        opacity: calc(0.3 + var(--lf-energy) * 0.5) !important;
    }
 
    .lf-ray {
        position: absolute !important;
        top: -50% !important;
        width: 1px !important;
        height: 200% !important;
        background: linear-gradient(to bottom, transparent, rgba(var(--A300), 0.08), transparent) !important;
        transform-origin: center center !important;
        animation: light-ray-drift 8s ease-in-out infinite !important;
        opacity: 0.5 !important;
    }
 
    /* ── Layer: Frost dots ── */
    .lf-frost-layer {
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        overflow: hidden !important;
        pointer-events: none !important;
        z-index: 0 !important;
    }
 
    .lf-frost-dot {
        position: absolute !important;
        border-radius: 50% !important;
        background: radial-gradient(circle, rgba(255,255,255,0.6), transparent) !important;
        animation: frost-float var(--frost-dur, 12s) ease-in-out infinite !important;
        animation-delay: var(--frost-delay, 0s) !important;
        opacity: 0.4 !important;
    }
 
    /* ── Layer: Signature sweep ── */
    .lf-signature-line {
        position: absolute !important;
        top: -30% !important;
        bottom: -30% !important;
        width: 60% !important;
        background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0) 20%,
            rgba(255,255,255,0.8) 40%,
            rgba(var(--A300),0.5) 50%,
            rgba(255,255,255,0.8) 60%,
            rgba(255,255,255,0) 80%,
            transparent 100%) !important;
        filter: blur(3px) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: 6 !important;
    }
    .lf-card.lf-signature .lf-signature-line {
        animation: light-sweep 680ms var(--E-OUT) 1 !important;
    }
 
    /* ═══════════════ FX LAYER ═══════════════ */
    .lf-fx-layer {
        position: absolute !important;
        inset: 0 !important;
        pointer-events: none !important;
        overflow: visible !important;
        z-index: 7 !important;
    }
 
    /* ═══════════════ ORB ═══════════════ */
    .lf-orb-wrap {
        position: relative !important;
        width: 34px !important;
        height: 34px !important;
        transform: translateZ(16px) !important;
        z-index: 3 !important;
        flex-shrink: 0 !important;
    }
 
    .lf-orb-ring {
        position: absolute !important;
        inset: -4px !important;
        border-radius: 50% !important;
        border: 1.5px solid rgba(var(--A400), calc(0.1 + var(--lf-energy)*0.4)) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: border-color var(--T-SMOOTH) var(--E-SNAP) !important;
    }
    .lf-orb-ring.lf-pulse {
        animation: ring-expand 400ms var(--E-OUT) forwards !important;
    }
 
    .lf-orb {
        width: 34px !important;
        height: 34px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 15px !important;
        line-height: 1 !important;
        position: relative !important;
        transition:
            background var(--T-SMOOTH) var(--E-SNAP),
            box-shadow var(--T-SMOOTH) var(--E-SNAP),
            transform var(--T-FAST) var(--E-OUT) !important;
    }
 
    .lf-on .lf-orb {
        background:
            radial-gradient(circle at 30% 30%,
                rgba(255,235,150,1) 0%,
                rgba(var(--A400),1) 50%,
                rgba(var(--A600),1) 100%) !important;
        box-shadow:
            0 0 0 1px rgba(255,255,255,0.3) inset,
            0 2px 8px rgba(var(--A700), 0.3),
            0 0 calc(12px + var(--lf-energy)*20px) rgba(var(--A400), calc(0.2 + var(--lf-energy)*0.4)),
            0 0 calc(30px + var(--lf-energy)*40px) rgba(var(--A300), calc(0.08 + var(--lf-energy)*0.15)) !important;
    }
 
    .lf-off .lf-orb {
        background:
            radial-gradient(circle at 30% 30%,
                rgba(148,163,184,0.9) 0%,
                rgba(100,116,139,0.95) 50%,
                rgba(71,85,105,1) 100%) !important;
        box-shadow:
            0 0 0 1px rgba(255,255,255,0.15) inset,
            0 2px 6px rgba(15,23,42, 0.2),
            0 0 8px rgba(100,116,139, 0.15) !important;
    }
 
    .lf-card.lf-toggle-anim .lf-orb {
        animation: orb-kick 400ms var(--E-SPRING) 0ms 1 both !important;
    }
 
    .lf-orb.lf-energy-pulse {
        animation: orb-energy-pulse 600ms var(--E-OUT) 1 !important;
    }
 
    /* ═══════════════ TEXT ═══════════════ */
    .lf-text {
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        min-width: 0 !important;
        z-index: 3 !important;
        transform: translateZ(10px) !important;
    }
 
    .lf-label {
        font-size: 13.5px !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em !important;
        white-space: nowrap !important;
        line-height: 1.2 !important;
        transition: color var(--T-SMOOTH) var(--E-SNAP), text-shadow var(--T-SMOOTH) var(--E-SNAP) !important;
    }
    .lf-on .lf-label {
        color: rgba(var(--A800), 0.95) !important;
        text-shadow: 0 0 20px rgba(var(--A400), calc(0.05 + var(--lf-energy)*0.15)) !important;
    }
    .lf-off .lf-label {
        color: rgba(var(--S600), 0.95) !important;
        text-shadow: none !important;
    }
 
    .lf-sub {
        font-size: 10.5px !important;
        font-weight: 500 !important;
        letter-spacing: 0.01em !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        line-height: 1.3 !important;
        transition: color var(--T-SMOOTH) var(--E-SNAP) !important;
    }
    .lf-on .lf-sub { color: rgba(var(--A700), 0.7) !important; }
    .lf-off .lf-sub { color: rgba(var(--S500), 0.7) !important; }
 
    .lf-label.lf-out, .lf-sub.lf-out {
        animation: text-out-up 120ms var(--E-OUT) both !important;
    }
    .lf-label.lf-in, .lf-sub.lf-in {
        animation: text-in-up 200ms var(--E-OUT) both !important;
    }
 
    /* ═══════════════ FORMAT BUTTON ═══════════════ */
    .lf-format {
        all: unset !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        padding: 5px 10px !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        font-family: var(--FONT-MONO) !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        letter-spacing: 0.06em !important;
        line-height: 1 !important;
        position: relative !important;
        overflow: hidden !important;
        z-index: 4 !important;
        transform: translateZ(20px) translate(var(--lf-mx), var(--lf-my)) !important;
        transition:
            transform var(--T-FAST) var(--E-OUT),
            background var(--T-SMOOTH) var(--E-SNAP),
            border-color var(--T-SMOOTH) var(--E-SNAP),
            color var(--T-SMOOTH) var(--E-SNAP),
            box-shadow var(--T-SMOOTH) var(--E-SNAP) !important;
        will-change: transform, opacity !important;
    }
 
    .lf-on .lf-format {
        color: rgba(var(--A800), 0.95) !important;
        background: linear-gradient(135deg, rgba(var(--A100), 0.6), rgba(var(--A50), 0.8)) !important;
        border: 1px solid rgba(var(--A300), 0.35) !important;
        box-shadow:
            0 1px 3px rgba(var(--A600), 0.08),
            0 0 calc(4px + var(--lf-energy)*12px) rgba(var(--A400), calc(0.06 + var(--lf-energy)*0.18)),
            inset 0 1px 0 rgba(255,255,255,0.5) !important;
    }
 
    .lf-off .lf-format {
        color: rgba(var(--S600), 0.85) !important;
        background: linear-gradient(135deg, rgba(var(--S400), 0.08), rgba(var(--S400), 0.15)) !important;
        border: 1px solid rgba(var(--S400), 0.2) !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
 
    .lf-format:hover {
        transform: translateZ(20px) translate(var(--lf-mx), var(--lf-my)) scale(1.06) !important;
    }
    .lf-format:active {
        transform: translateZ(20px) translate(var(--lf-mx), var(--lf-my)) scale(0.97) !important;
    }
 
    .lf-format::before {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(105deg,
            transparent 40%,
            rgba(255,255,255,0.4) 45%,
            rgba(255,255,255,0.1) 50%,
            transparent 55%) !important;
        transform: translateX(-100%) !important;
        transition: transform 0.6s ease !important;
        pointer-events: none !important;
    }
    .lf-format:hover::before {
        transform: translateX(100%) !important;
    }
 
    .lf-format-icon {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        will-change: transform, opacity !important;
        font-style: normal !important;
    }
    .lf-format-text {
        display: inline-block !important;
        will-change: transform, opacity !important;
    }
 
    .lf-format-icon.lf-flip {
        animation: icon-flip-in 240ms var(--E-SPRING) both !important;
    }
    .lf-format-text.lf-slide {
        animation: text-slide-in 200ms var(--E-OUT) both !important;
    }
 
    /* ═══════════════ RIPPLE ═══════════════ */
    .lf-ripple {
        position: absolute !important;
        border-radius: 999px !important;
        pointer-events: none !important;
        transform-origin: center center !important;
        z-index: 1 !important;
    }
    .lf-ripple.main {
        background: radial-gradient(circle,
            rgba(var(--A300), 0.3) 0%,
            rgba(var(--A200), 0.15) 40%,
            transparent 70%) !important;
        animation: ripple-wave var(--T-BASE) var(--E-OUT) forwards !important;
    }
    .lf-ripple.chromatic {
        border: 1.5px solid rgba(var(--A200), 0.25) !important;
        box-shadow:
            0 0 0 1px rgba(var(--A400), 0.1) inset,
            0 0 4px rgba(var(--A300), 0.08) !important;
        animation: ripple-chromatic 500ms var(--E-OUT) forwards !important;
    }
 
    /* ═══════════════ PARTICLES ═══════════════ */
    .lf-particle {
        position: absolute !important;
        left: var(--lx) !important;
        top: var(--ly) !important;
        width: var(--ls) !important;
        height: var(--ls) !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        animation: particle-fly var(--ll) var(--E-OUT) forwards !important;
    }
    .lf-particle.lf-core {
        background: radial-gradient(circle at 30% 30%,
            rgba(255,255,255,1) 0%,
            rgba(var(--A300), 0.9) 40%,
            rgba(var(--A500), 0.7) 100%) !important;
        box-shadow:
            0 0 6px rgba(var(--A400), 0.6),
            0 0 12px rgba(var(--A300), 0.2) !important;
    }
    .lf-particle.lf-spark {
        background: radial-gradient(circle at 30% 30%,
            rgba(255,255,255,1) 0%,
            rgba(200,220,255,0.8) 50%,
            transparent 100%) !important;
        box-shadow: 0 0 4px rgba(180,200,255,0.5) !important;
    }
 
    /* ═══════════════ NOTIFICATION BUBBLE ═══════════════ */
    #lf-bubble {
        position: absolute !important;
        bottom: calc(100% + 14px) !important;
        left: 50% !important;
        right: auto !important;
        transform: translateX(-50%) translateY(8px) scale(0.94) !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        padding: 9px 16px !important;
        border-radius: 12px !important;
        font-family: var(--FONT-SANS) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.01em !important;
        line-height: 1 !important;
        width: max-content !important;
        max-width: none !important;
        opacity: 0 !important;
        filter: drop-shadow(0 12px 24px rgba(2,6,23,0.14)) !important;
        z-index: 12 !important;
        backdrop-filter: blur(16px) saturate(1.4) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.4) !important;
    }

    #lf-bubble.lf-bubble-standalone {
        position: fixed !important;
        right: 28px !important;
        bottom: 28px !important;
        left: auto !important;
        transform: translateY(8px) scale(0.94) !important;
        z-index: 2147483647 !important;
    }
 
    #lf-bubble.lf-ok {
        background: linear-gradient(135deg,
            rgba(255,255,255,0.95),
            rgba(240,253,244,0.96)) !important;
        border: 1px solid rgba(var(--OK), 0.25) !important;
        color: rgba(22,101,52,0.95) !important;
    }
    #lf-bubble.lf-fail {
        background: linear-gradient(135deg,
            rgba(255,255,255,0.95),
            rgba(254,242,242,0.96)) !important;
        border: 1px solid rgba(var(--ERR), 0.25) !important;
        color: rgba(153,27,27,0.95) !important;
    }
 
    #lf-bubble.lf-show {
        opacity: 1 !important;
        transform: translateX(-50%) translateY(0) scale(1) !important;
    }
    #lf-bubble.lf-bubble-standalone.lf-show {
        transform: translateY(0) scale(1) !important;
    }
    #lf-bubble.lf-show.lf-ok {
        animation: bubble-enter-ok 220ms var(--E-OUT) both !important;
    }
    #lf-bubble.lf-show.lf-fail {
        animation: bubble-enter-err 260ms var(--E-OUT) both !important;
    }
    #lf-bubble.lf-bubble-standalone.lf-show.lf-ok {
        animation: bubble-enter-standalone-ok 220ms var(--E-OUT) both !important;
    }
    #lf-bubble.lf-bubble-standalone.lf-show.lf-fail {
        animation: bubble-enter-standalone-err 260ms var(--E-OUT) both !important;
    }
    #lf-bubble.lf-hiding {
        animation: bubble-exit 180ms var(--E-IN-OUT) both !important;
    }
    #lf-bubble.lf-bubble-standalone.lf-hiding {
        animation: bubble-exit-standalone 180ms var(--E-IN-OUT) both !important;
    }
 
    #lf-bubble::after {
        content: "" !important;
        position: absolute !important;
        left: 50% !important;
        right: auto !important;
        margin-left: -7px !important;
        bottom: -7px !important;
        width: 14px !important;
        height: 7px !important;
        clip-path: polygon(0 0, 100% 0, 50% 100%) !important;
        filter: drop-shadow(0 1px 1px rgba(2,6,23,0.06)) !important;
    }
    #lf-bubble.lf-ok::after { background: rgba(240,253,244,0.98) !important; }
    #lf-bubble.lf-fail::after { background: rgba(254,242,242,0.98) !important; }
    #lf-bubble.lf-bubble-standalone::after { display: none !important; }
 
    .lf-status-dot {
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 9px !important;
        line-height: 1 !important;
        flex-shrink: 0 !important;
    }
    #lf-bubble.lf-ok .lf-status-dot {
        background: rgba(var(--OK), 0.12) !important;
        border: 1px solid rgba(var(--OK), 0.3) !important;
        color: rgba(var(--OK), 1) !important;
    }
    #lf-bubble.lf-fail .lf-status-dot {
        background: rgba(var(--ERR), 0.12) !important;
        border: 1px solid rgba(var(--ERR), 0.3) !important;
        color: rgba(var(--ERR), 1) !important;
    }
 
    /* ═══════════════ CARD PRESS ═══════════════ */
    .lf-card.lf-press {
        transform:
            rotateX(var(--lf-rx))
            rotateY(var(--lf-ry))
            scale3d(calc(var(--lf-dsx) * 0.97), calc(var(--lf-dsy) * 0.97), 1)
            translateZ(0) !important;
        transition-duration: var(--T-INSTANT) !important;
    }
 
    /* ═══════════════ UNLOCKED ═══════════════ */
    .lf-unlocked * {
        user-select: auto !important;
        -webkit-user-select: auto !important;
    }
 
    /* ═══════════════ REDUCED MOTION ═══════════════ */
    @media (prefers-reduced-motion: reduce) {
        .lf-card, .lf-orb, .lf-orb-ring, .lf-card::before, .lf-card::after,
        #lf-panel-root, .lf-ripple, #lf-bubble, .lf-particle, .lf-signature-line,
        .lf-format::before, .lf-grain, .lf-ray, .lf-frost-dot, .lf-orb.lf-energy-pulse {
            animation: none !important;
            transition-duration: 0ms !important;
        }
    }
    `);
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Helpers
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
 
    function safeFn(fn, fallback) {
        try {
            const r = fn();
            if (r && typeof r.catch === 'function') {
                return r.catch(e => { console.debug('[AutoCopy]', e); return fallback; });
            }
            return r;
        } catch (e) { console.debug('[AutoCopy]', e); return fallback; }
    }
 
    function getEditableInteractionTarget(e) {
        const path = typeof e?.composedPath === 'function' ? e.composedPath() : [e?.target];
        return path.find(node => node?.nodeType === Node.ELEMENT_NODE && (
            node.matches?.('input, textarea, [role="textbox"]') || node.isContentEditable
        )) || null;
    }

    function isTextControl(element) {
        return element?.tagName === 'TEXTAREA' || (
            element?.tagName === 'INPUT' && /^(text|search|url|tel|password|email)$/i.test(element.type)
        );
    }

    function getTextControlSelection(element) {
        if (!isTextControl(element)) return null;
        try {
            const start = element.selectionStart;
            const end = element.selectionEnd;
            if (typeof start !== 'number' || typeof end !== 'number' || end <= start) return '';
            return element.value.slice(start, end).trim();
        } catch (_) {
            return '';
        }
    }

    function getSelectionInfo(e, editableTarget = null) {
        return safeFn(() => {
            const doc = editableTarget?.ownerDocument || e?.target?.ownerDocument || document;
            try { void doc.location.href; } catch (_) {
                return { text: '', html: '', url: location.href };
            }
            const url = doc.location?.href || location.href;

            if (editableTarget?.tagName === 'INPUT' || editableTarget?.tagName === 'TEXTAREA') {
                const text = getTextControlSelection(editableTarget) || '';
                return { text, html: text, url };
            }

            const sel = doc.getSelection?.();
            const selectedText = sel?.toString?.().trim() || '';
            if (selectedText) {
                let html = '';
                if (sel.rangeCount > 0) {
                    const frag = doc.createDocumentFragment();
                    for (let i = 0; i < sel.rangeCount; i++) frag.appendChild(sel.getRangeAt(i).cloneContents());
                    const wrap = doc.createElement('div');
                    wrap.appendChild(frag);
                    html = wrap.innerHTML || selectedText;
                }
                return { text: selectedText, html, url };
            }

            if (copyInEditable) {
                const text = getTextControlSelection(doc.activeElement);
                if (text !== null) return { text, html: text, url };
            }
            return { text: '', html: '', url };
        }, { text: '', html: '', url: location.href });
    }
 
    function getBubbleEl() {
        if (!ui.bubble) {
            ui.bubble = document.createElement('div');
            ui.bubble.id = 'lf-bubble';
            ui.bubble.innerHTML = '<span class="lf-status-dot"></span><span></span>';
        }

        const panelHost = showBtn && panel ? panel : null;
        if (panelHost) {
            if (ui.bubble.parentNode !== panelHost) panelHost.insertBefore(ui.bubble, panelHost.firstChild);
            ui.bubble.classList.remove('lf-bubble-standalone');
        } else {
            const root = document.body || document.documentElement;
            if (!root) return null;
            if (ui.bubble.parentNode !== root) root.appendChild(ui.bubble);
            ui.bubble.classList.add('lf-bubble-standalone');
        }
        return ui.bubble;
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Energy System
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function applyEnergyVisual() {
        if (!ui.card) return;
        const e = energy;
        ui.card.style.setProperty('--lf-energy', e.toFixed(3));
        ui.card.style.setProperty('--lf-spin-dur', `${lerp(8, 3, e).toFixed(2)}s`);
    }
 
    function bumpEnergy(delta = 0.12) {
        energy = clamp(energy + delta, 0, 1);
        applyEnergyVisual();
        ensureEnergyLoop();
    }
 
    function energyTick(ts) {
        if (!panelMounted || !panel) { cancelAnimationFrame(energyRAF); energyRAF = 0; lastEnergyTs = 0; return; }
        if (!lastEnergyTs) lastEnergyTs = ts;
        const dt = ts - lastEnergyTs;
        lastEnergyTs = ts;
        try {
            energy *= Math.exp(-dt / TUNE.ENERGY_DECAY_MS);
            if (energy < TUNE.ENERGY_FLOOR) { energy = 0; applyEnergyVisual(); energyRAF = 0; lastEnergyTs = 0; return; }
            applyEnergyVisual();
            energyRAF = requestAnimationFrame(energyTick);
        } catch (_) { energyRAF = 0; lastEnergyTs = 0; }
    }
 
    function ensureEnergyLoop() {
        if (energyRAF) return;
        lastEnergyTs = 0;
        energyRAF = requestAnimationFrame(energyTick);
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FX Helpers
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function pulseOrb() {
        if (!ui.orbWrap) return;
        const ring = ui.orbWrap.querySelector('.lf-orb-ring');
        if (ring) {
            ring.classList.remove('lf-pulse');
            void ring.offsetWidth;
            ring.classList.add('lf-pulse');
            setTimeout(() => ring?.classList.remove('lf-pulse'), TUNE.PULSE_CLEANUP_MS);
        }
        if (ui.orb) {
            ui.orb.classList.remove('lf-energy-pulse');
            void ui.orb.offsetWidth;
            ui.orb.classList.add('lf-energy-pulse');
            setTimeout(() => ui.orb?.classList.remove('lf-energy-pulse'), 600);
        }
    }
 
    function triggerSignature() {
        if (!ui.card || prefersReduced()) return;
        const now = Date.now();
        if (now - lastSignatureTs < TUNE.SIGNATURE_COOLDOWN_MS) return;
        lastSignatureTs = now;
        ui.card.classList.remove('lf-signature');
        void ui.card.offsetWidth;
        ui.card.classList.add('lf-signature');
        setTimeout(() => ui.card?.classList.remove('lf-signature'), TUNE.SIGNATURE_DURATION_MS);
    }
 
    function emitParticles(count = 8, cx, cy) {
        if (!ui.fxLayer || prefersReduced()) return;
        const existing = ui.fxLayer.querySelectorAll('.lf-particle');
        if (existing.length > TUNE.PARTICLE_CAP) existing.forEach(p => p.remove());
 
        const rect = ui.card.getBoundingClientRect();
        const px = cx ?? rect.width * 0.5;
        const py = cy ?? rect.height * 0.45;
 
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            const isCore = Math.random() > 0.35;
            p.className = `lf-particle ${isCore ? 'lf-core' : 'lf-spark'}`;
 
            const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.8;
            const radius = 18 + Math.random() * 36;
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius - 6;
            const life = 280 + Math.random() * 280;
            const size = isCore ? (2 + Math.random() * 3) : (1 + Math.random() * 2);
 
            p.style.setProperty('--lx', `${px}px`);
            p.style.setProperty('--ly', `${py}px`);
            p.style.setProperty('--px', `${dx.toFixed(1)}px`);
            p.style.setProperty('--py', `${dy.toFixed(1)}px`);
            p.style.setProperty('--ll', `${life.toFixed(0)}ms`);
            p.style.setProperty('--ls', `${size.toFixed(1)}px`);
            p.style.setProperty('--ps', `${(0.1 + Math.random() * 0.2).toFixed(2)}`);
 
            const cleanup = () => { if (p.parentNode) p.remove(); };
            p.addEventListener('animationend', cleanup, { once: true });
            setTimeout(cleanup, life + 200);
            ui.fxLayer.appendChild(p);
        }
    }
 
    function spawnRipple(e) {
        if (!ui.card || prefersReduced()) return;
        const rect = ui.card.getBoundingClientRect();
        const cx = typeof e?.clientX === 'number' ? (e.clientX - rect.left) : rect.width / 2;
        const cy = typeof e?.clientY === 'number' ? (e.clientY - rect.top) : rect.height / 2;
 
        const dist = Math.max(
            Math.hypot(cx, cy), Math.hypot(rect.width - cx, cy),
            Math.hypot(cx, rect.height - cy), Math.hypot(rect.width - cx, rect.height - cy)
        );
        const s1 = Math.ceil(dist * 2.1);
        const s2 = Math.ceil(s1 * 1.3);
 
        const mk = (cls, sz) => {
            const el = document.createElement('span');
            el.className = cls;
            el.style.cssText = `width:${sz}px;height:${sz}px;left:${cx - sz/2}px;top:${cy - sz/2}px;`;
            return el;
        };
 
        const r1 = mk('lf-ripple main', s1);
        const r2 = mk('lf-ripple chromatic', s2);
        ui.card.appendChild(r1);
        ui.card.appendChild(r2);
        setTimeout(() => r1.remove(), TUNE.RIPPLE_DURATION_MS);
        setTimeout(() => r2.remove(), TUNE.RIPPLE_DURATION_MS + 120);
    }
 
    function showBubble(kind, customText) {
        if (!showCopyBubble) return;
        const bubble = getBubbleEl();
        if (!bubble) return;
        const ok = kind !== 'fail';
        const standaloneClass = showBtn && panel ? '' : ' lf-bubble-standalone';
        bubble.className = `${ok ? 'lf-ok' : 'lf-fail'}${standaloneClass}`;
        bubble.id = 'lf-bubble';
        const displayText = customText || (ok ? t.toast : t.toastFail);
        const dot = bubble.querySelector('.lf-status-dot');
        const txt = bubble.querySelector('span:not(.lf-status-dot)');
        if (dot) dot.textContent = ok ? '✓' : '✕';
        if (txt) txt.textContent = displayText;
 
        clearTimeout(bubbleTimer);
        clearTimeout(bubbleHideTimer);
        bubble.classList.remove('lf-hiding');
        void bubble.offsetWidth;
        bubble.classList.add('lf-show');
 
        bubbleTimer = setTimeout(() => {
            bubble.classList.remove('lf-show');
            bubble.classList.add('lf-hiding');
        }, TUNE.BUBBLE_SHOW_MS);
        bubbleHideTimer = setTimeout(() => bubble.classList.remove('lf-hiding'), TUNE.BUBBLE_HIDE_CLEANUP_MS);
    }
 
    async function copyToClipboard(content) {
        if (!content) return false;
        if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(content); onCopySuccess(); return true; } catch (_) {}
        }
        try {
            const sel = window.getSelection();
            const range = document.createRange();
            const span = document.createElement('span');
            span.textContent = content;
            span.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
            (document.body || document.documentElement).appendChild(span);
            range.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(range);
            const ok = document.execCommand('copy');
            sel.removeAllRanges();
            span.remove();
            if (ok) onCopySuccess(); else { showBubble('fail'); bumpEnergy(0.04); }
            return ok;
        } catch (_) { showBubble('fail'); bumpEnergy(0.03); return false; }
    }
 
    function onCopySuccess() {
        showBubble('ok');
        pulseOrb();
        bumpEnergy(0.18);
        successCount += 1;
        emitParticles(successCount % 3 === 0 ? 14 : 7);
        triggerSignature();
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Core: restriction removal + auto copy
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const eventsToBlock = ['contextmenu', 'copy', 'cut', 'selectstart', 'dragstart'];
 
    const preventAction = (e) => {
        if (!isEnabled) return;
        if (panel && panel.contains(e.target)) return;
        e.stopPropagation();
        e.stopImmediatePropagation();
    };

    const mouseDownListener = (e) => {
        mouseDownEditableTarget = getEditableInteractionTarget(e);
    };
 
    const mouseUpListener = (e) => {
        const editableTarget = mouseDownEditableTarget || getEditableInteractionTarget(e);
        mouseDownEditableTarget = null;
        clearTimeout(copyTimer);
        if (!isEnabled) return;
        if (panel && panel.contains(e.target)) return;
        if (editableTarget && !copyInEditable) return;

        const editableSelection = editableTarget ? getSelectionInfo(e, editableTarget) : null;
        copyTimer = setTimeout(async () => {
            try {
                const sel = editableSelection || getSelectionInfo(e);
                if (!sel.text) return;
                let finalText = sel.text;
                if (copyFormat === 'link') finalText = `${sel.text}\n${sel.url}`;
                else if (copyFormat === 'html') finalText = sel.html || sel.text;
                await copyToClipboard(finalText);
            } catch (err) { console.debug('[AutoCopy] mouseUp copy error', err); }
        }, TUNE.COPY_DELAY_MS);
    };
 
    function updateFunctionalState(active) {
        if (activeController) { activeController.abort(); activeController = null; }
        if (!active) {
            clearTimeout(copyTimer);
            mouseDownEditableTarget = null;
        }
        safeFn(() => {
            const html = document.documentElement;
            if (!html) return;
            if (active) {
                html.classList.add('lf-unlocked');
                activeController = new AbortController();
                const opts = { capture: true, signal: activeController.signal };
                eventsToBlock.forEach(ev => document.addEventListener(ev, preventAction, opts));
                document.addEventListener('mousedown', mouseDownListener, opts);
                document.addEventListener('mouseup', mouseUpListener, opts);
            } else {
                html.classList.remove('lf-unlocked');
            }
        });
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UI Build
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function bindUIRefs() {
        ui.card = panel.querySelector('.lf-card');
        ui.orbWrap = panel.querySelector('.lf-orb-wrap');
        ui.orb = panel.querySelector('.lf-orb');
        ui.label = panel.querySelector('.lf-label');
        ui.sub = panel.querySelector('.lf-sub');
        ui.formatBtn = panel.querySelector('.lf-format');
        ui.formatIcon = panel.querySelector('.lf-format-icon');
        ui.formatText = panel.querySelector('.lf-format-text');
        ui.fxLayer = panel.querySelector('.lf-fx-layer');
        ui.signatureLine = panel.querySelector('.lf-signature-line');
        ui.lightRays = panel.querySelector('.lf-light-rays');
        ui.frostLayer = panel.querySelector('.lf-frost-layer');
        ui.glowOrb = panel.querySelector('.lf-orb-ring');
        ui.grainOverlay = panel.querySelector('.lf-grain');
    }
 
    function refreshPanelUI() {
        if (!panel || !ui.card) return;
        const stateClass = isEnabled ? 'lf-on' : 'lf-off';
        ui.card.classList.remove('lf-on', 'lf-off');
        ui.card.classList.add(stateClass);
        ui.orb.textContent = isEnabled ? '🔓' : '🔒';
        ui.label.textContent = isEnabled ? t.on : t.off;
        ui.sub.textContent = isEnabled ? t.subOn : t.subOff;
        ui.formatIcon.textContent = FORMAT_ICONS[copyFormat] || '•';
        ui.formatText.textContent = FORMAT_LABELS[copyFormat] || copyFormat.toUpperCase();
        ui.formatBtn.title = t.formatTitle;
        applyEnergyVisual();
    }
 
    function animateFormatFlip(oldRect) {
        if (prefersReduced() || !ui.formatBtn) return;
        const btn = ui.formatBtn;
        const newRect = btn.getBoundingClientRect();
        if (oldRect) {
            const dx = oldRect.left - newRect.left, dy = oldRect.top - newRect.top;
            const sx = oldRect.width / Math.max(newRect.width, 1), sy = oldRect.height / Math.max(newRect.height, 1);
            btn.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.8 },
                { transform: `translate(var(--lf-mx), var(--lf-my)) scale(1,1)`, opacity: 1 }
            ], { duration: TUNE.FORMAT_FLIP_DURATION_MS, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        }
        if (ui.formatIcon) {
            ui.formatIcon.classList.remove('lf-flip');
            void ui.formatIcon.offsetWidth;
            ui.formatIcon.classList.add('lf-flip');
            setTimeout(() => ui.formatIcon?.classList.remove('lf-flip'), 300);
        }
        if (ui.formatText) {
            ui.formatText.classList.remove('lf-slide');
            void ui.formatText.offsetWidth;
            ui.formatText.classList.add('lf-slide');
            setTimeout(() => ui.formatText?.classList.remove('lf-slide'), 260);
        }
    }
 
    function cycleFormat() {
        const idx = FORMAT_CYCLE.indexOf(copyFormat);
        copyFormat = FORMAT_CYCLE[(idx + 1) % FORMAT_CYCLE.length];
        GM_setValue(CONFIG.FORMAT, copyFormat);
        if (panel && ui.card) {
            const oldRect = ui.formatBtn?.getBoundingClientRect() || null;
            refreshPanelUI();
            animateFormatFlip(oldRect);
            spawnRipple();
            pulseOrb();
            bumpEnergy(0.11);
            emitParticles(5);
            showBubble('ok', t.formatToast(FORMAT_LABELS[copyFormat]));
        }
    }
 
    function animateStateSwap(nextEnabled) {
        if (!ui.card || !ui.label || !ui.sub) { isEnabled = nextEnabled; refreshPanelUI(); return; }
        ui.card.classList.add('lf-toggle-anim');
        ui.label.classList.remove('lf-in'); ui.sub.classList.remove('lf-in');
        ui.label.classList.add('lf-out'); ui.sub.classList.add('lf-out');
        setTimeout(() => {
            isEnabled = nextEnabled;
            refreshPanelUI();
            ui.label.classList.remove('lf-out'); ui.sub.classList.remove('lf-out');
            ui.label.classList.add('lf-in'); ui.sub.classList.add('lf-in');
        }, TUNE.STATE_SWAP_DELAY_MS);
        setTimeout(() => {
            ui.card?.classList.remove('lf-toggle-anim');
            ui.label?.classList.remove('lf-in'); ui.sub?.classList.remove('lf-in');
        }, TUNE.STATE_SWAP_CLEANUP_MS);
    }
 
    function toggleEnabled() {
        const next = !isEnabled;
        updateFunctionalState(next);
        GM_setValue(CONFIG.ENABLED, next);
        animateStateSwap(next);
        pulseOrb();
        bumpEnergy(next ? 0.2 : 0.07);
        emitParticles(next ? 12 : 6);
        if (next) triggerSignature();
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3D Tilt + Magnetic Effects
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function makeFancyTilt(root) {
        let raf = 0;
        root.addEventListener('mousemove', (e) => {
            if (!ui.card || root.classList.contains('lf-dragging') || raf) return;
            raf = requestAnimationFrame(() => {
                try {
                    const r = ui.card.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width - 0.5;
                    const py = (e.clientY - r.top) / r.height - 0.5;
                    const rx = clamp(-py * TUNE.TILT_MAX_RX, -TUNE.TILT_MAX_RX, TUNE.TILT_MAX_RX).toFixed(2);
                    const ry = clamp(px * TUNE.TILT_MAX_RY, -TUNE.TILT_MAX_RY, TUNE.TILT_MAX_RY).toFixed(2);
                    ui.card.style.setProperty('--lf-rx', `${rx}deg`);
                    ui.card.style.setProperty('--lf-ry', `${ry}deg`);
 
                    const hx = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100).toFixed(1);
                    const hy = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100).toFixed(1);
                    ui.card.style.setProperty('--lf-hx', `${hx}%`);
                    ui.card.style.setProperty('--lf-hy', `${hy}%`);
 
                    if (ui.formatBtn) {
                        const b = ui.formatBtn.getBoundingClientRect();
                        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
                        const dx = e.clientX - cx, dy = e.clientY - cy;
                        const dist = Math.hypot(dx, dy);
                        if (dist < TUNE.FORMAT_MAGNET_RANGE && dist > 0.001) {
                            const pull = Math.pow(1 - dist / TUNE.FORMAT_MAGNET_RANGE, 2) * TUNE.FORMAT_MAGNET_PULL;
                            ui.card.style.setProperty('--lf-mx', `${((dx / dist) * pull).toFixed(2)}px`);
                            ui.card.style.setProperty('--lf-my', `${((dy / dist) * pull).toFixed(2)}px`);
                        } else {
                            ui.card.style.setProperty('--lf-mx', '0px');
                            ui.card.style.setProperty('--lf-my', '0px');
                        }
                    }
                } finally { raf = 0; }
            });
        });
        root.addEventListener('mouseleave', () => {
            if (!ui.card) return;
            ui.card.style.setProperty('--lf-rx', '0deg');
            ui.card.style.setProperty('--lf-ry', '0deg');
            ui.card.style.setProperty('--lf-hx', '50%');
            ui.card.style.setProperty('--lf-hy', '18%');
            ui.card.style.setProperty('--lf-mx', '0px');
            ui.card.style.setProperty('--lf-my', '0px');
        });
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Drag System
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function makeDraggable(el) {
        let startX = 0, startY = 0, startRight = 0, startBottom = 0;
        let dragging = false, suppressClick = false;
        let lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0;
 
        const savedX = GM_getValue(CONFIG.POS_X, null);
        const savedY = GM_getValue(CONFIG.POS_Y, null);
        if (savedX !== null) el.style.right = `${savedX}px`;
        if (savedY !== null) el.style.bottom = `${savedY}px`;
 
        const releaseSuppress = () => setTimeout(() => { suppressClick = false; }, TUNE.DRAG_SUPPRESS_MS);
 
        el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            dragging = false;
            startX = e.clientX; startY = e.clientY;
            lastX = e.clientX; lastY = e.clientY;
            lastT = performance.now(); vx = 0; vy = 0;
            const r = el.getBoundingClientRect();
            startRight = window.innerWidth - r.right;
            startBottom = window.innerHeight - r.bottom;
 
            const onMove = (ev) => {
                const now = performance.now(), dt = Math.max(8, now - lastT);
                vx = (ev.clientX - lastX) / dt; vy = (ev.clientY - lastY) / dt;
                lastX = ev.clientX; lastY = ev.clientY; lastT = now;
                const dx = ev.clientX - startX, dy = ev.clientY - startY;
                if (!dragging && (Math.abs(dx) + Math.abs(dy) > TUNE.DRAG_THRESHOLD_PX)) {
                    dragging = true;
                    el.classList.add('lf-dragging');
                }
                if (!dragging) return;
                const maxR = Math.max(0, window.innerWidth - r.width);
                const maxB = Math.max(0, window.innerHeight - r.height);
                el.style.right = `${clamp(startRight - dx, 0, maxR)}px`;
                el.style.bottom = `${clamp(startBottom + dy, 0, maxB)}px`;
 
                if (ui.card && !prefersReduced()) {
                    const speed = Math.hypot(vx, vy);
                    const f = clamp(speed * 0.1, 0, 0.05);
                    let sx = 1, sy = 1;
                    if (Math.abs(vx) >= Math.abs(vy)) { sx = 1 + f; sy = 1 - f * 0.74; }
                    else { sy = 1 + f; sx = 1 - f * 0.74; }
                    ui.card.style.setProperty('--lf-dsx', sx.toFixed(4));
                    ui.card.style.setProperty('--lf-dsy', sy.toFixed(4));
                }
            };
 
            const onEnd = () => {
                window.removeEventListener('pointermove', onMove, true);
                window.removeEventListener('pointerup', onEnd, true);
                window.removeEventListener('pointercancel', onEnd, true);
                if (dragging) {
                    suppressClick = true;
                    const rNow = el.getBoundingClientRect();
                    const maxR = Math.max(0, window.innerWidth - rNow.width);
                    const maxB = Math.max(0, window.innerHeight - rNow.height);
                    const edge = TUNE.DRAG_EDGE_SNAP_PX;
                    const inertiaT = prefersReduced() ? 0 : TUNE.DRAG_INERTIA_MS;
 
                    let cr = parseFloat(el.style.right) || 0;
                    let cb = parseFloat(el.style.bottom) || 0;
                    let tr = clamp(cr - vx * TUNE.DRAG_MOMENTUM, 0, maxR);
                    let tb = clamp(cb + vy * TUNE.DRAG_MOMENTUM, 0, maxB);
                    if (tr < edge) tr = 0; else if (tr > maxR - edge) tr = maxR;
                    if (tb < edge) tb = 0; else if (tb > maxB - edge) tb = maxB;
 
                    el.style.transition = inertiaT ? `right ${inertiaT}ms var(--E-OUT), bottom ${inertiaT}ms var(--E-OUT)` : 'none';
                    el.style.right = `${tr}px`; el.style.bottom = `${tb}px`;
                    const settle = () => {
                        el.style.transition = '';
                        GM_setValue(CONFIG.POS_X, parseFloat(el.style.right) || 0);
                        GM_setValue(CONFIG.POS_Y, parseFloat(el.style.bottom) || 0);
                    };
                    if (inertiaT) el.addEventListener('transitionend', settle, { once: true }); else settle();
 
                    if (ui.card) {
                        ui.card.style.transition = `transform 180ms var(--E-OUT)`;
                        ui.card.style.setProperty('--lf-dsx', '1');
                        ui.card.style.setProperty('--lf-dsy', '1');
                        setTimeout(() => { if (ui.card) ui.card.style.transition = ''; }, TUNE.DRAG_CARD_RESET_MS);
                    }
                    releaseSuppress();
                }
                el.classList.remove('lf-dragging');
                setTimeout(() => { dragging = false; }, 0);
            };
            window.addEventListener('pointermove', onMove, true);
            window.addEventListener('pointerup', onEnd, true);
            window.addEventListener('pointercancel', onEnd, true);
        });
 
        el.addEventListener('click', (e) => {
            if (suppressClick || el.classList.contains('lf-dragging')) {
                e.preventDefault(); e.stopImmediatePropagation();
            }
        }, true);
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Generate decorative elements
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function generateLightRays() {
        let html = '';
        for (let i = 0; i < TUNE.LIGHT_RAY_COUNT; i++) {
            const angle = (360 / TUNE.LIGHT_RAY_COUNT) * i + (Math.random() * 30 - 15);
            const left = 15 + (i / TUNE.LIGHT_RAY_COUNT) * 70;
            const dur = 6 + Math.random() * 6;
            const delay = Math.random() * 4;
            html += `<div class="lf-ray" style="left:${left}%;--ray-angle:${angle}deg;animation-duration:${dur}s;animation-delay:${delay}s;"></div>`;
        }
        return html;
    }
 
    function generateFrostDots() {
        let html = '';
        for (let i = 0; i < TUNE.FROST_COUNT; i++) {
            const x = 10 + Math.random() * 80;
            const y = 10 + Math.random() * 80;
            const size = 2 + Math.random() * 6;
            const dur = 8 + Math.random() * 10;
            const delay = Math.random() * 5;
            const fx1 = (Math.random() * 6 - 3).toFixed(1);
            const fy1 = (Math.random() * 6 - 3).toFixed(1);
            const fx2 = (Math.random() * 6 - 3).toFixed(1);
            const fy2 = (Math.random() * 6 - 3).toFixed(1);
            const fx3 = (Math.random() * 6 - 3).toFixed(1);
            const fy3 = (Math.random() * 6 - 3).toFixed(1);
            html += `<div class="lf-frost-dot" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;--frost-dur:${dur}s;--frost-delay:${delay}s;--fx1:${fx1}px;--fy1:${fy1}px;--fx2:${fx2}px;--fy2:${fy2}px;--fx3:${fx3}px;--fy3:${fy3}px;"></div>`;
        }
        return html;
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Panel Construction
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function buildPanelOnce() {
        try {
            panel = document.createElement('div');
            panel.id = 'lf-panel-root';
            panel.innerHTML = `
                <div class="lf-card ${isEnabled ? 'lf-on' : 'lf-off'}" data-role="card">
                    <div class="lf-fx-layer"></div>
                    <div class="lf-signature-line"></div>
                    <div class="lf-light-rays">${generateLightRays()}</div>
                    <div class="lf-frost-layer">${generateFrostDots()}</div>
                    <div class="lf-grain"></div>
                    <div class="lf-orb-wrap">
                        <div class="lf-orb-ring"></div>
                        <div class="lf-orb">🔓</div>
                    </div>
                    <div class="lf-text">
                        <span class="lf-label"></span>
                        <span class="lf-sub"></span>
                    </div>
                    <button class="lf-format" data-role="format" title="">
                        <span class="lf-format-icon"></span>
                        <span class="lf-format-text"></span>
                    </button>
                </div>
            `;
        } catch (e) {
            console.debug('[AutoCopy] Failed to create panel', e);
            panel = null;
            return;
        }
        bindUIRefs();
 
        panel.addEventListener('pointerdown', (e) => {
            const card = e.target.closest('.lf-card');
            if (card) card.classList.add('lf-press');
        }, true);
        panel.addEventListener('pointerup', () => ui.card?.classList.remove('lf-press'), true);
        panel.addEventListener('pointercancel', () => ui.card?.classList.remove('lf-press'), true);
        panel.addEventListener('mouseleave', () => ui.card?.classList.remove('lf-press'), true);
 
        panel.addEventListener('click', (e) => {
            const formatBtn = e.target.closest('[data-role="format"]');
            if (formatBtn) {
                e.preventDefault(); e.stopPropagation();
                spawnRipple(e);
                cycleFormat();
                return;
            }
            const card = e.target.closest('[data-role="card"]');
            if (!card) return;
            e.preventDefault(); e.stopPropagation();
            spawnRipple(e);
            toggleEnabled();
        });
 
        makeDraggable(panel);
        makeFancyTilt(panel);
    }
 
    function destroyPanel() {
        const bubbleWasActive = ui.bubble?.classList.contains('lf-show') ||
            ui.bubble?.classList.contains('lf-hiding');
        if (panel) { try { panel.remove(); } catch (_) {} panel = null; }
        panelMounted = false;
        if (energyRAF) { cancelAnimationFrame(energyRAF); energyRAF = 0; lastEnergyTs = 0; }
        if (bubbleWasActive && showCopyBubble) getBubbleEl();
    }
 
    function renderPanel() {
        if (!showBtn) { destroyPanel(); return; }
        if (!panel) safeFn(() => buildPanelOnce());
        if (!panel) return;
        const mount = () => {
            const root = document.body;
            if (!root) return false;
            if (!root.contains(panel)) { root.appendChild(panel); panelMounted = true; }
            if (ui.bubble) getBubbleEl();
            refreshPanelUI();
            ensureEnergyLoop();
            return true;
        };
        if (!mount()) document.addEventListener('DOMContentLoaded', mount, { once: true });
    }
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Viewport boundary on resize
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    window.addEventListener('resize', () => {
        if (!panel || !panelMounted) return;
        const r = panel.getBoundingClientRect();
        const maxR = Math.max(0, window.innerWidth - r.width);
        const maxB = Math.max(0, window.innerHeight - r.height);
        let changed = false;
        const cr = parseFloat(panel.style.right) || 0;
        const cb = parseFloat(panel.style.bottom) || 0;
        if (cr > maxR) { panel.style.right = `${maxR}px`; changed = true; }
        if (cb > maxB) { panel.style.bottom = `${maxB}px`; changed = true; }
        if (changed) {
            GM_setValue(CONFIG.POS_X, parseFloat(panel.style.right) || 0);
            GM_setValue(CONFIG.POS_Y, parseFloat(panel.style.bottom) || 0);
        }
    });
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Tampermonkey Menu
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    GM_registerMenuCommand(t.menuToggle, () => toggleEnabled());
    GM_registerMenuCommand(t.menuBtn, () => {
        showBtn = !showBtn;
        GM_setValue(CONFIG.SHOW_BTN, showBtn);
        renderPanel();
    });
    GM_registerMenuCommand(t.menuEditable, () => {
        copyInEditable = !copyInEditable;
        GM_setValue(CONFIG.COPY_EDITABLE, copyInEditable);
    });
    GM_registerMenuCommand(t.menuBubble, () => {
        showCopyBubble = !showCopyBubble;
        GM_setValue(CONFIG.SHOW_BUBBLE, showCopyBubble);
        if (!showCopyBubble) {
            clearTimeout(bubbleTimer);
            clearTimeout(bubbleHideTimer);
            ui.bubble?.classList.remove('lf-show', 'lf-hiding');
        }
    });
    GM_registerMenuCommand(t.menuFormat(copyFormat), () => cycleFormat());
 
    function cycleSiteMode() {
        const modes = [SITE_MODE.OFF, SITE_MODE.WHITELIST, SITE_MODE.BLACKLIST];
        const current = GM_getValue(CONFIG.SITE_MODE, SITE_MODE.OFF);
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        GM_setValue(CONFIG.SITE_MODE, next);
        const labels = { off: 'OFF', whitelist: 'Whitelist', blacklist: 'Blacklist' };
        showBubble('ok', t.siteModeToast(labels[next] || next));
        if (!isSiteAllowed()) {
            updateFunctionalState(false);
            isEnabled = false;
            GM_setValue(CONFIG.ENABLED, false);
            renderPanel();
        } else if (!isEnabled) toggleEnabled();
    }
 
    function promptSiteList(listType) {
        const current = GM_getValue(listType, '');
        const input = prompt(`${t.siteListPromptTitle}\n\n${t.siteListPromptMsg}`, current);
        if (input !== null && input !== current) {
            GM_setValue(listType, input);
            if (!isSiteAllowed()) {
                updateFunctionalState(false);
                isEnabled = false;
                GM_setValue(CONFIG.ENABLED, false);
                renderPanel();
            }
        }
    }
 
    GM_registerMenuCommand((() => {
        const mode = GM_getValue(CONFIG.SITE_MODE, SITE_MODE.OFF);
        const labels = { off: 'OFF', whitelist: 'Whitelist', blacklist: 'Blacklist' };
        return t.menuSiteMode(labels[mode] || mode);
    })(), cycleSiteMode);
 
    GM_registerMenuCommand(t.menuSiteWhitelist, () => promptSiteList(CONFIG.SITE_WHITELIST));
    GM_registerMenuCommand(t.menuSiteBlacklist, () => promptSiteList(CONFIG.SITE_BLACKLIST));
    GM_registerMenuCommand(t.shortcutToggle, () => {});
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Keyboard Shortcut
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyX') {
            e.preventDefault();
            toggleEnabled();
        }
    }, { passive: false });
 
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Bootstrap
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!isSiteAllowed()) {
        isEnabled = false;
        GM_setValue(CONFIG.ENABLED, false);
    }
    updateFunctionalState(isEnabled);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderPanel, { once: true });
    } else {
        renderPanel();
    }
})();
