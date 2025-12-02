import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { BACKGROUND_THEMES } from '../constants/themes';

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <div className="card" style={{ marginBottom: '30px' }}>
      <div className="section-header">
        <h3>App Settings</h3>
        <button onClick={onClose} className="btn btn-secondary">
          <X size={20} />
        </button>
      </div>
      
      <div className="form-group">
        <label>Background Theme</label>
        <select
          value={localSettings.backgroundTheme}
          onChange={(e) => setLocalSettings({ ...localSettings, backgroundTheme: e.target.value })}
          className="input"
        >
          {Object.entries(BACKGROUND_THEMES).map(([key, theme]) => (
            <option key={key} value={key}>{theme.name}</option>
          ))}
        </select>
      </div>

      <div className="button-group">
        <button 
          onClick={() => {
            onSave(localSettings);
            onClose();
          }} 
          className="btn btn-success"
        >
          <Save size={20} />
          Save Settings
        </button>
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
      </div>
    </div>
  );
}