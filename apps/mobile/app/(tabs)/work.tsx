import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading, Pressable } from '../../components/ui';

// Work Task Item
function TaskItem({ 
  title, 
  location, 
  time, 
  status, 
  priority 
}: { 
  title: string;
  location: string;
  time: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}) {
  const statusColors = {
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Хүлээгдэж буй' },
    in_progress: { bg: '#DBEAFE', text: '#2563EB', label: 'Хийгдэж буй' },
    completed: { bg: '#FEF3C7', text: '#e17100', label: 'Дууссан' },
  };

  const priorityColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#f59e0b',
  };

  const statusInfo = statusColors[status];

  return (
    <Pressable style={styles.taskCard}>
      <View style={[styles.priorityBar, { backgroundColor: priorityColors[priority] }]} />
      <VStack className="flex-1 pl-3">
        <HStack className="justify-between items-start mb-2">
          <Text size="md" className="text-typography-900 font-semibold flex-1">
            {title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text size="xs" style={{ color: statusInfo.text, fontWeight: '600' }}>
              {statusInfo.label}
            </Text>
          </View>
        </HStack>
        
        <HStack space="md" className="items-center">
          <HStack space="xs" className="items-center">
            <MapPin size={14} color="#6B7280" />
            <Text size="sm" className="text-typography-500">{location}</Text>
          </HStack>
          <HStack space="xs" className="items-center">
            <Clock size={14} color="#6B7280" />
            <Text size="sm" className="text-typography-500">{time}</Text>
          </HStack>
        </HStack>
      </VStack>
      <ChevronRight size={20} color="#9CA3AF" />
    </Pressable>
  );
}

export default function WorkScreen() {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const tasks = [
    {
      id: '1',
      title: 'Номин супермаркет - Захиалга авах',
      location: 'БЗД, 3-р хороо',
      time: '09:00',
      status: 'in_progress' as const,
      priority: 'high' as const,
    },
    {
      id: '2',
      title: 'Гоёл дэлгүүр - Бараа хүргэх',
      location: 'СБД, 5-р хороо',
      time: '11:30',
      status: 'pending' as const,
      priority: 'medium' as const,
    },
    {
      id: '3',
      title: 'Макс молл - Төлбөр авах',
      location: 'ЧД, 2-р хороо',
      time: '14:00',
      status: 'pending' as const,
      priority: 'high' as const,
    },
    {
      id: '4',
      title: 'Мах маркет - Тайлан илгээх',
      location: 'БГД, 8-р хороо',
      time: '16:30',
      status: 'completed' as const,
      priority: 'low' as const,
    },
  ];

  // Count by status
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Today's Summary */}
      <View style={styles.summaryContainer}>
        <HStack className="items-center mb-4">
          <Calendar size={20} color="#2563EB" />
          <Text size="md" className="text-typography-700 ml-2 font-medium">
            Өнөөдрийн ажлууд
          </Text>
        </HStack>
        
        <HStack className="justify-between">
          <View style={styles.summaryCard}>
            <Text size="2xl" className="text-warning-600 font-bold">{pendingCount}</Text>
            <Text size="xs" className="text-typography-500">Хүлээгдэж буй</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text size="2xl" className="text-primary-600 font-bold">{inProgressCount}</Text>
            <Text size="xs" className="text-typography-500">Хийгдэж буй</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text size="2xl" className="text-success-600 font-bold">{completedCount}</Text>
            <Text size="xs" className="text-typography-500">Дууссан</Text>
          </View>
        </HStack>
      </View>

      {/* Tasks List */}
      <VStack space="md" className="px-4 mt-4">
        <Heading size="md" className="text-typography-900">Ажлын жагсаалт</Heading>
        
        {tasks.map((task) => (
          <TaskItem key={task.id} {...task} />
        ))}
      </VStack>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityBar: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
