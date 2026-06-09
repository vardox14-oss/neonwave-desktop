const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NeonWaveDesktop', {
    isElectron: true,
    setDiscordPresence: (payload) => ipcRenderer.invoke('discord-presence:set', payload),
    clearDiscordPresence: () => ipcRenderer.invoke('discord-presence:clear'),
    onUpdaterStatus: (callback) => {
        ipcRenderer.on('updater:status', (event, status, details) => callback(status, details));
    },
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('app:version')
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('NeonWave Shell loaded');
});

