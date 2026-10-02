import { useEffect, useRef, useState, useCallback } from 'react';
import type { Workspace } from '@/lib/chat-types';
import { decodeWorkspace, encodeWorkspace, WORKSPACE_KEY } from '@/lib/workspace-storage';

export function useWorkspaceStorage(state:Omit<Workspace,'views'>, captureViews:()=>Workspace['views'], restore:(value:Workspace)=>void) {
 const [ready,setReady]=useState(false),[status,setStatus]=useState<'saved'|'pending'|'error'|'recovered'>('pending');
 const live=useRef({state,captureViews,restore});live.current={state,captureViews,restore};
 const enabled=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const dirty=useRef(false);
 const flush=useCallback(()=>{
  if(!enabled.current||!dirty.current)return;
  if(timer.current)clearTimeout(timer.current);
  try {
   const {state,captureViews}=live.current;
   localStorage.setItem(WORKSPACE_KEY,encodeWorkspace({...state,views:captureViews()}));
   dirty.current=false;setStatus('saved');
  }catch{setStatus('error');}
 },[]);
 const schedule=useCallback(()=>{
  if(!enabled.current)return;
  dirty.current=true;if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(flush,400);
 },[flush]);
 useEffect(()=>{
  try{const raw=localStorage.getItem(WORKSPACE_KEY);if(raw)live.current.restore(decodeWorkspace(raw));setStatus('saved');}
  catch{setStatus('recovered');}
  enabled.current=true;setReady(true);
  const onHidden=()=>{if(document.visibilityState==='hidden')flush();};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',onHidden);
  return()=>{flush();enabled.current=false;if(timer.current)clearTimeout(timer.current);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',onHidden);};
 },[flush]);
 useEffect(()=>{if(ready)schedule();},[state,ready,schedule]);
 return {ready,status,schedule,flush};
}
