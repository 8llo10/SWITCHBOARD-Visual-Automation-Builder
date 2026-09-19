export function sessionDuration(value:string){
 const match=/^(\d+)([smhd])?$/.exec(value);
 if(!match)throw new Error('JWT_EXPIRES_IN must be a duration such as 30m or 8h');
 const factor:Record<string,number>={s:1,m:60,h:3600,d:86400};
 return Math.max(300,Math.min(86400,Number(match[1])*factor[match[2]||'s']));
}
