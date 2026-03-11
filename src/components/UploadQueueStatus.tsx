import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getPendingQueueItems,
  deleteQueueItem,
  UploadQueueDBItem,
} from '../database/uploadQueue.db';
import { uploadQueueManager } from '../services/uploadQueue.manager';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#FFA000'; // amber
    case 'uploading':
      return '#1976D2'; // blue
    case 'failed':
    case 'failed_permanent':
      return '#D32F2F'; // red
    default:
      return '#757575';
  }
};

const statusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'uploading':
      return 'Uploading';
    case 'failed':
      return 'Failed';
    case 'failed_permanent':
      return 'Failed (Permanent)';
    default:
      return status;
  }
};

const UploadQueueStatus: React.FC<Props> = ({ visible, onClose }) => {
  const [items, setItems] = useState<UploadQueueDBItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);
    const data = await getPendingQueueItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      loadQueue();
    }
  }, [visible]);

  const handleRetryAll = async () => {
    await uploadQueueManager['processQueue']?.();
    loadQueue();
  };

  const handleDelete = async (id: string) => {
    await deleteQueueItem(id);
    loadQueue();
  };

  const renderItem = ({ item }: { item: UploadQueueDBItem }) => (
    <View style={styles.item}>
      <View style={styles.row}>
        <MaterialCommunityIcons
          name={item.type === 'image' ? 'image' : 'video'}
          size={22}
          color="#555"
        />
        <Text style={styles.fileText} numberOfLines={1}>
          {item.paramName}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.status, { color: statusColor(item.status) }]}>
          {statusText(item.status)}
        </Text>

        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <MaterialCommunityIcons name="delete" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload Queue</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" />
          ) : items.length === 0 ? (
            <Text style={styles.empty}>No pending uploads 🎉</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}

          {items.length > 0 && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetryAll}
            >
              <Text style={styles.retryText}>Retry Pending Uploads</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UploadQueueStatus;

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginVertical: 40,
    fontSize: 16,
    color: '#555',
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
