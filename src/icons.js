const paths={
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
 locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-5 2 2-5z"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
 earth:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18z"/>',
 weather:'<path d="M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 3 4 4 0 0 1-1 7z"/>',
 disasters:'<path d="M12 3 2 20h20zM12 9v5m0 3h.01"/>',
 space:'<path d="M12 3v18M3 12h18m-15-6 12 12m0-12L6 18"/><circle cx="12" cy="12" r="4"/>',
 air:'<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a3 3 0 1 1-3 3"/>',
 marine:'<path d="M2 8c4-5 6 5 10 0s6 5 10 0M2 14c4-5 6 5 10 0s6 5 10 0M2 20c4-5 6 5 10 0s6 5 10 0"/>',
 sources:'<path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5"/>',
 analysis:'<path d="M3 3v18h18M6 16l5-5 4 3 6-8"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3-1-1 4 2 2v2l-2 2 1 4 3-1 3 1 1 3h4l1-3 3-1 3 1 1-4-2-2v-2l2-2-1-4-3 1-3-1-1-3z"/>',
 measure:'<path d="m3 15 12-12 6 6L9 21zM7 11l3 3m1-7 3 3m1-7 3 3"/>',
 refresh:'<path d="M20 7V3m0 4h-4M20 7a9 9 0 1 0 1 8"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
 pin:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/>',
 theme:'<circle cx="12" cy="12" r="5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'
};
export const icon=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.map)+'</svg>';
