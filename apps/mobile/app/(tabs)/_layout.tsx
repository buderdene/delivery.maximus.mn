import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Image, Platform, Text as RNText, ScrollView, Alert } from 'react-native';
import { Warehouse, Truck, Menu, X, User, Settings, LogOut, ChevronRight, MapPin, BarChart3, Home } from 'lucide-react-native';
import * as Application from 'expo-application';
import { version as appVersion } from '../../package.json';
import { useAuthStore } from '../../stores/delivery-auth-store';

// Drawer Menu Component
function DrawerMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [deviceId, setDeviceId] = useState<string>('');

  // Get device ID (same as login screen)
  useEffect(() => {
    const getDeviceId = async () => {
      if (Platform.OS === 'ios') {
        const iosId = await Application.getIosIdForVendorAsync();
        setDeviceId(iosId || 'Unknown');
      } else if (Platform.OS === 'android') {
        setDeviceId(Application.getAndroidId() || 'Unknown');
      }
    };
    getDeviceId();
  }, []);

  const menuItems = [
    { icon: User, label: 'Профайл', route: '/profile', color: '#2563EB' },
    { icon: MapPin, label: 'Байршил', route: '/location', color: '#e17100' },
    { icon: Settings, label: 'Тохиргоо', route: '/settings', color: '#6B7280' },
  ];

  const handleMenuPress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = () => {
    Alert.alert(
      'Гарах',
      'Та системээс гарахдаа итгэлтэй байна уу?',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Гарах',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onClose();
            router.replace('/login');
          }
        },
      ]
    );
  };

  // Get initials from user name
  const userInitials = useMemo(() => {
    const name = user?.name || 'Хэрэглэгч';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  // Worker type label
  const workerTypeLabel = useMemo(() => {
    const type = user?.worker_type;
    if (type === 'driver') return 'Жолооч';
    if (type === 'warehouse') return 'Нярав';
    return 'Ажилтан';
  }, [user?.worker_type]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  return (
    <View style={styles.drawerOverlay}>
      <TouchableOpacity style={styles.drawerBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.drawerContent}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.headerRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <RNText style={styles.avatarInitials}>{userInitials}</RNText>
              )}
            </View>
            {/* User Info */}
            <View style={styles.userInfo}>
              <RNText style={styles.drawerUserName} numberOfLines={1}>
                {user?.name || 'Хэрэглэгч'}
              </RNText>
              <View style={styles.workerBadge}>
                <RNText style={styles.workerBadgeText}>{workerTypeLabel}</RNText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={20} color={item.color} />
              </View>
              <RNText style={styles.menuLabel}>{item.label}</RNText>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* App Info */}
          <View style={styles.appInfoSection}>
            <View style={styles.appInfoRow}>
              <RNText style={styles.appInfoLabel}>App Version</RNText>
              <RNText style={styles.appInfoValue}>{appVersion}</RNText>
            </View>
            <View style={styles.appInfoRow}>
              <RNText style={styles.appInfoLabel}>Device ID</RNText>
              <RNText style={styles.appInfoValue} numberOfLines={1} ellipsizeMode="middle">
                {deviceId || '...'}
              </RNText>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#FFFFFF" />
            <RNText style={styles.logoutText}>Системээс гарах</RNText>
          </TouchableOpacity>

          {/* Copyright */}
          <RNText style={styles.copyright}>
            Delivery Maximus © 2026
          </RNText>
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerMenuButton}
              onPress={() => setDrawerOpen(true)}
            >
              <Menu size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      >
        {/* Нүүр Tab - Dashboard */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Нүүр',
            headerTitle: 'Өнөөдрийн тойм',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />

        {/* Агуулах Tab - Warehouse checking */}
        <Tabs.Screen
          name="warehouse"
          options={{
            title: 'Агуулах',
            headerTitle: 'Агуулах тулгалт',
            tabBarIcon: ({ color, size }) => <Warehouse size={size} color={color} />,
          }}
        />
        
        {/* Түгээлт Tab - Delivery orders */}
        <Tabs.Screen
          name="delivery"
          options={{
            title: 'Түгээлт',
            headerTitle: 'Түгээлт',
            tabBarIcon: ({ color, size }) => <Truck size={size} color={color} />,
          }}
        />

        {/* Тайлан Tab - Today's report */}
        <Tabs.Screen
          name="report"
          options={{
            title: 'Тайлан',
            headerTitle: 'Өнөөдрийн тайлан',
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          }}
        />

        {/* Hidden screens - for navigation but not in tab bar */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="promo"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="partners"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="work"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            href: null,
          }}
        />
      </Tabs>

      <DrawerMenu isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 85,
    paddingTop: 8,
    paddingBottom: 25,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerMenuButton: {
    marginLeft: 16,
    padding: 8,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  drawerHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  drawerUserName: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  workerBadge: {
    marginTop: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  workerBadgeText: {
    fontSize: 11,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    flex: 1,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
  },
  bottomSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  appInfoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  appInfoLabel: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  appInfoValue: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#374151',
    maxWidth: 180,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
  copyright: {
    fontSize: 10,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});
