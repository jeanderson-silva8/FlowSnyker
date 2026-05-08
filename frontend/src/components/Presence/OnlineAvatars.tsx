import { usePresenceStore } from '../../store/usePresenceStore';

export default function OnlineAvatars() {
  const { onlineUsers } = usePresenceStore();

  if (onlineUsers.length === 0) return null;

  return (
    <div className="online-avatars">
      {onlineUsers.slice(0, 5).map((u) => (
        <div key={u.userId} style={{ position: 'relative' }} title={`${u.name} está online`}>
          {u.avatar && !u.avatar.includes('ui-avatars') && !u.avatar.includes('dicebear') ? (
            <img className="online-avatar" src={u.avatar} alt={u.name} style={{ objectFit: 'cover' }} />
          ) : (
            <div className="online-avatar avatar-circle" style={{ fontSize: 12 }}>
              {u.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
          )}
          <span className="online-dot" />
        </div>
      ))}
      {onlineUsers.length > 5 && (
        <div
          className="online-avatar"
          style={{
            background: 'var(--bg-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          +{onlineUsers.length - 5}
        </div>
      )}
    </div>
  );
}
