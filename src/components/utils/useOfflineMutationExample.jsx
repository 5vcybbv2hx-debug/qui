# useOfflineMutation Hook - Verwendungsbeispiel

## Installation in einer Page/Component

```jsx
import { useOfflineMutation } from '@/components/utils/useOfflineMutation';
import { base44 } from '@/api/base44Client';

function MyComponent() {
  // Define the mutation function
  const createArticle = (data) => base44.entities.Article.create(data);

  // Use the hook
  const { mutate, isPending, error, isOffline } = useOfflineMutation(
    'Article',
    createArticle,
    { onSuccess: () => console.log('Created') }
  );

  const handleCreateArticle = async (formData) => {
    try {
      await mutate(formData, 'create');
      // Success - either synced or queued
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <div>
      <button onClick={() => handleCreateArticle({ name: 'Beer' })} disabled={isPending}>
        {isPending ? 'Saving...' : 'Add Article'}
      </button>
      {isOffline && <p>Offline - Änderungen werden gespeichert und synchronisiert</p>}
      {error && <p>Fehler: {error}</p>}
    </div>
  );
}
```

## For Update
```jsx
const updateArticle = (data) => base44.entities.Article.update(data.id, data);
const { mutate } = useOfflineMutation('Article', updateArticle);

await mutate(updatedData, 'update');
```

## For Delete
```jsx
const deleteArticle = (id) => base44.entities.Article.delete(id);
const { mutate } = useOfflineMutation('Article', deleteArticle);

await mutate({ id }, 'delete');
```

## Automatic Sync Behavior
- **Online**: Mutations werden sofort ausgeführt
- **Offline**: Mutations werden in IndexedDB gequeued
- **Back Online**: Mutations werden automatisch synchronisiert
- **Sync Feedback**: OfflineSyncManager zeigt Status in der UI