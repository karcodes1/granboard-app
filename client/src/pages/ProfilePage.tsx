import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { ArrowLeft, User, Save } from 'lucide-react';
import { firebaseService } from '../services/firebase';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, serverDisplayName, error, clearError } = useGameStore();
  const [displayName, setDisplayName] = useState(serverDisplayName || user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await firebaseService.updateDisplayName(displayName.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-2">
      {/* Header */}
      <div className="flex items-center justify-between py-2 flex-shrink-0 border-b border-gray-700">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="w-6" />
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 px-3 py-2 rounded mt-2 text-sm flex-shrink-0">
          {error}
          <button onClick={clearError} className="ml-2">×</button>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-900/50 text-emerald-300 px-3 py-2 rounded mt-2 text-sm flex-shrink-0">
          Display name updated!
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto py-4">
        <div className="max-w-md mx-auto space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input w-full"
              placeholder="Enter display name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="text"
              value={user?.email || 'Guest'}
              className="input w-full bg-gray-800 text-gray-400"
              disabled
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Account Type</label>
            <div className="text-sm">
              {user?.isAnonymous ? (
                <span className="text-amber-400">Guest Account</span>
              ) : (
                <span className="text-emerald-400">Registered Account</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving || !displayName.trim()}
        className="btn btn-primary w-full py-3 flex-shrink-0 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
