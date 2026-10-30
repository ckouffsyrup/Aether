import React from 'react';
import {createRoot} from 'react-dom/client';
import {invoke} from '@tauri-apps/api/core';
import './styles/index.css';
import {isDesktop} from './shared';
import {App} from './App';

// Ask the native side how Aether was launched before the first render, so a
// sign-in launch can stay hidden in the tray without ever flashing the splash.
const launchContext=isDesktop()?invoke<boolean>('launch_context').catch(()=>false):Promise.resolve(false);
launchContext.then(atLogin=>createRoot(document.getElementById('root')!).render(<React.StrictMode><App launchedAtLogin={atLogin}/></React.StrictMode>));
