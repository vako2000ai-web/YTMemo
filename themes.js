const svg=body=>`<svg class="theme-art" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
export const themes={
 classic:{name:'Классика',art:svg('<circle cx="32" cy="32" r="22"/><ellipse cx="32" cy="32" rx="10" ry="22"/><path d="M10 32h44M15 20h34M15 44h34"/>')},
 newyear:{name:'Новый год',art:svg('<path class="art-solid" d="m32 8 14 18h-7l13 16H39l12 12H13l12-12H12l13-16h-7z"/><path d="M32 54v7"/><path class="art-gold" d="m32 1 2 5h5l-4 3 1 5-4-3-4 3 1-5-4-3h5z"/><circle cx="29" cy="26" r="2"/><circle cx="36" cy="39" r="2"/><circle cx="25" cy="47" r="2"/><path d="M5 14h6M8 11v6M51 23h6M54 20v6"/>')},
 halloween:{name:'Хэллоуин',art:svg('<path d="M32 15c-2-7 4-11 8-12"/><path class="art-solid" d="M32 17C8 8 0 40 15 54c5 5 12 4 17 2 5 2 12 3 17-2 15-14 7-46-17-37z"/><path class="art-cut" d="m20 27-6 10h13zm24 0-7 10h13zM17 43l9 6 6-4 6 4 9-6-4 9H21z"/><path d="M32 20v18"/>')},
 christmas:{name:'Рождество',art:svg('<path class="art-gold" d="m32 4 7 19 21 1-16 13 5 21-17-12-17 12 5-21L4 24l21-1z"/><path d="m32 13 5 16 15-1-13 10 4 13-11-8-11 8 4-13-13-10 15 1zM2 5l3 4M60 5l-3 4M3 58l4-3M61 58l-4-3"/>')},
 valentine:{name:'День влюблённых',art:svg('<path class="art-solid" d="M32 54 8 31C-8 10 21-3 32 17 43-3 72 10 56 31z"/><path d="m18 21 6-4M6 51l8-8M50 8l7-5"/><path class="art-gold" d="m43 35 5 8 9-2-6 8 4 8-9-3-6 7 1-10-8-5 10-1z"/>')},
 easter:{name:'Пасха',art:svg('<path class="art-solid" d="M32 5C17 5 6 35 10 47c6 19 38 19 44 0C58 35 47 5 32 5z"/><path d="m14 27 6 4 6-4 6 4 6-4 6 4 6-4M11 42h42M16 52l5-3 6 3 5-3 6 3 6-3 5 3"/><circle cx="24" cy="37" r="2"/><circle cx="40" cy="37" r="2"/><path class="art-gold" d="M28 17h8M32 13v8"/>')}
};
export function seasonTheme(date=new Date()){const month=date.getMonth()+1,day=date.getDate();if(month===10)return 'halloween';if(month===12)return day<26?'christmas':'newyear';if(month===1&&day<=14)return 'newyear';if(month===2&&day<=14)return 'valentine';return 'classic';}
export function resolveTheme(id,date=new Date()){return id==='auto'?seasonTheme(date):themes[id]?id:'classic';}
