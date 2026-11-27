const paths={
 earth:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/>',
 weather:'<path d="M6 17a4 4 0 1 1 1-8 6 6 0 0 1 11 1 3.5 3.5 0 0 1 0 7Z"/>',
 disasters:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v.1"/>',
 space:'<path d="M12 2 14.5 9.5 22 12l-7.5 2.5L12 22 9.5 14.5 2 12l7.5-2.5Z"/>',
 air:'<path d="M3 8h14a3 3 0 1 0-3-3M3 12h18M3 16h12a3 3 0 1 1-3 3"/>',
 marine:'<path d="M2 6q4-4 8 0t8 0l4-2M2 12q4-4 8 0t8 0l4-2M2 18q4-4 8 0t8 0l4-2"/>',
 sources:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h8"/>',
 analysis:'<path d="M3 3v18h18M7 16l4-5 4 3 6-8"/>',
 radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 6-6"/>',
 orbit:'<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-30 12 12)"/>',
 models:'<path d="M3 7h18M3 12h18M3 17h18"/><circle cx="8" cy="7" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="10" cy="17" r="1.5"/>',
 fft:'<path d="M2 12h3l3-8 4 16 4-16 3 8h3"/>',
 cap:'<path d="M12 3 3 7v5c0 5 5 8 9 10 4-2 9-5 9-10V7Z"/><path d="M12 8v5m0 3v.1"/>',
 twin:'<path d="M3 21V8l9-5 9 5v13ZM3 8l9 5 9-5M12 13v8M7 10v3m10-3v3"/>',
 ai:'<rect x="5" y="6" width="14" height="14" rx="4"/><path d="M12 2v4M2 12h3m14 0h3M9 12v2m6-2v2m-5 3h4"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m4 10 2-1 1-2V4l3-1 2 2h2l2-2 3 1v3l1 2 2 1v4l-2 1-1 2v3l-3 1-2-2h-2l-2 2-3-1v-3l-1-2-2-1Z"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5m-2 5a8 8 0 0 0 14 5"/>',
 theme:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'
};
export function iconSvg(name){return '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.earth)+'</svg>';}
