import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  LogIn,
  LogOut,
  History,
  Wifi,
  WifiOff,
  Navigation,
} from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';

// Time Display Component
function TimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('mn-MN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('mn-MN', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <VStack className="items-center">
      <Text size="6xl" className="text-typography-900 font-bold tracking-tight">
        {formatTime(currentTime)}
      </Text>
      <Text size="md" className="text-typography-500 mt-1">
        {formatDate(currentTime)}
      </Text>
    </VStack>
  );
}

// Location Status Component
function LocationStatus({ 
  isInRange, 
  distance, 
  officeName 
}: { 
  isInRange: boolean;
  distance: number;
  officeName: string;
}) {
  return (
    <View style={[
      styles.locationCard, 
      { borderColor: isInRange ? '#f59e0b' : '#EF4444' }
    ]}>
      <HStack className="items-center justify-between">
        <HStack space="md" className="items-center flex-1">
          <View style={[
            styles.locationIcon,
            { backgroundColor: isInRange ? '#FEF3C7' : '#FEE2E2' }
          ]}>
            {isInRange ? (
              <MapPin size={24} color="#f59e0b" />
            ) : (
              <Navigation size={24} color="#EF4444" />
            )}
          </View>
          <VStack className="flex-1">
            <Text size="md" className="text-typography-900 font-semibold">
              {officeName}
            </Text>
            <HStack space="xs" className="items-center">
              {isInRange ? (
                <>
                  <CheckCircle2 size={14} color="#f59e0b" />
                  <Text size="sm" className="text-success-600">
                    Бүсэд байна
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={14} color="#EF4444" />
                  <Text size="sm" className="text-error-600">
                    {distance}м зайтай
                  </Text>
                </>
              )}
            </HStack>
          </VStack>
        </HStack>
        <View style={styles.wifiStatus}>
          <Wifi size={18} color="#f59e0b" />
        </View>
      </HStack>
    </View>
  );
}

// Check In/Out Button
function CheckButton({ 
  type, 
  isActive, 
  onPress, 
  disabled 
}: { 
  type: 'in' | 'out';
  isActive: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const isCheckIn = type === 'in';
  const baseColor = isCheckIn ? '#f59e0b' : '#EF4444';
  const Icon = isCheckIn ? LogIn : LogOut;
  const label = isCheckIn ? 'ИРСЭН' : 'ЯВСАН';
  
  return (
    <TouchableOpacity 
      style={[
        styles.checkButton,
        { backgroundColor: disabled ? '#E5E7EB' : baseColor },
        isActive && styles.checkButtonActive,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.checkButtonInner}>
        <Icon size={40} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
        <Text 
          size="xl" 
          style={{ color: disabled ? '#9CA3AF' : '#FFFFFF', fontWeight: '700', marginTop: 8 }}
        >
          {label}
        </Text>
        {isActive && (
          <View style={styles.activeIndicator}>
            <CheckCircle2 size={20} color="#FFFFFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Today's Record
function TodayRecord({ 
  checkInTime, 
  checkOutTime,
  totalHours,
}: { 
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: string;
}) {
  return (
    <View style={styles.recordCard}>
      <HStack className="items-center mb-4">
        <History size={20} color="#2563EB" />
        <Text size="md" className="text-typography-700 ml-2 font-semibold">
          Өнөөдрийн бүртгэл
        </Text>
      </HStack>
      
      <HStack className="justify-between">
        <VStack className="items-center flex-1">
          <View style={[styles.timeBox, { backgroundColor: '#FEF3C7' }]}>
            <LogIn size={18} color="#f59e0b" />
          </View>
          <Text size="xs" className="text-typography-500 mt-2">Ирсэн</Text>
          <Text size="lg" className="text-typography-900 font-bold">
            {checkInTime || '--:--'}
          </Text>
        </VStack>
        
        <View style={styles.divider} />
        
        <VStack className="items-center flex-1">
          <View style={[styles.timeBox, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={18} color="#EF4444" />
          </View>
          <Text size="xs" className="text-typography-500 mt-2">Явсан</Text>
          <Text size="lg" className="text-typography-900 font-bold">
            {checkOutTime || '--:--'}
          </Text>
        </VStack>
        
        <View style={styles.divider} />
        
        <VStack className="items-center flex-1">
          <View style={[styles.timeBox, { backgroundColor: '#DBEAFE' }]}>
            <Clock size={18} color="#2563EB" />
          </View>
          <Text size="xs" className="text-typography-500 mt-2">Нийт</Text>
          <Text size="lg" className="text-typography-900 font-bold">
            {totalHours || '0ц 0м'}
          </Text>
        </VStack>
      </HStack>
    </View>
  );
}

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const [isInRange, setIsInRange] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | undefined>();
  const [checkOutTime, setCheckOutTime] = useState<string | undefined>();

  const handleCheckIn = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCheckInTime(time);
    setHasCheckedIn(true);
    Alert.alert(
      'Амжилттай ✓',
      `${time} цагт ирцийн бүртгэл хийгдлээ`,
      [{ text: 'OK' }]
    );
  };

  const handleCheckOut = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCheckOutTime(time);
    setHasCheckedOut(true);
    Alert.alert(
      'Амжилттай ✓',
      `${time} цагт явсан бүртгэл хийгдлээ`,
      [{ text: 'OK' }]
    );
  };

  // Calculate total hours
  const calculateTotalHours = () => {
    if (!checkInTime || !checkOutTime) return undefined;
    
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}ц ${minutes}м`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Time Display */}
      <View style={styles.timeContainer}>
        <TimeDisplay />
      </View>

      {/* Location Status */}
      <View style={styles.section}>
        <LocationStatus 
          isInRange={isInRange}
          distance={150}
          officeName="MAXIMUS Төв оффис"
        />
      </View>

      {/* Check In/Out Buttons */}
      <View style={styles.buttonsContainer}>
        <CheckButton 
          type="in"
          isActive={hasCheckedIn}
          onPress={handleCheckIn}
          disabled={!isInRange || hasCheckedIn}
        />
        <CheckButton 
          type="out"
          isActive={hasCheckedOut}
          onPress={handleCheckOut}
          disabled={!isInRange || !hasCheckedIn || hasCheckedOut}
        />
      </View>

      {/* Help Text */}
      {!isInRange && (
        <View style={styles.helpText}>
          <Text size="sm" className="text-typography-500 text-center">
            Ирц бүртгүүлэхийн тулд оффисийн 200м-ийн{'\n'}радиус дотор байх шаардлагатай
          </Text>
        </View>
      )}

      {/* Today's Record */}
      <View style={styles.section}>
        <TodayRecord 
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          totalHours={calculateTotalHours()}
        />
      </View>

      {/* Weekly Summary */}
      <View style={styles.section}>
        <View style={styles.weeklyCard}>
          <Heading size="sm" className="text-typography-900 mb-4">
            Энэ долоо хоногийн ирц
          </Heading>
          <HStack className="justify-between">
            {['Да', 'Мя', 'Лх', 'Пү', 'Ба'].map((day, index) => {
              const isToday = index === 4;
              const isPresent = index < 4;
              return (
                <VStack key={day} className="items-center">
                  <Text size="xs" className="text-typography-500 mb-2">{day}</Text>
                  <View style={[
                    styles.dayIndicator,
                    isPresent && styles.dayPresent,
                    isToday && styles.dayToday,
                  ]}>
                    {isPresent && <CheckCircle2 size={16} color="#FFFFFF" />}
                  </View>
                </VStack>
              );
            })}
          </HStack>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  timeContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wifiStatus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  checkButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  checkButtonActive: {
    opacity: 0.7,
  },
  checkButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -15,
    right: -15,
    backgroundColor: '#e17100',
    borderRadius: 12,
    padding: 2,
  },
  helpText: {
    marginTop: 16,
    paddingHorizontal: 32,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },
  weeklyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPresent: {
    backgroundColor: '#f59e0b',
  },
  dayToday: {
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
});
