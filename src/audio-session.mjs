let active;
// Claim before any asynchronous loading so a superseded request cannot restart.
export function claimAudio(stop) {
  const previous=active;active=undefined;previous?.stop();
  const lease={stop,current:()=>active===lease,release(){if(active===lease)active=undefined;}};
  active=lease;return lease;
}
