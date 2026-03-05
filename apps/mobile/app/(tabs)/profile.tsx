/**
 * ПРОФАЙЛ ДЭЛГЭЦ (Profile Screen)
 *
 * Ажилтны дэлгэрэнгүй мэдээлэл:
 * - Хувийн мэдээлэл (нэр, утас, имэйл, хэлтэс, албан тушаал)
 * - Хүргэлтийн мэдээлэл (төрөл, тусгай зөвшөөрөл)
 * - Машины мэдээлэл (товч)
 * - Хамт ажиллагчид
 * - Өнөөдрийн статистик
 * - Яаралтай холбоо барих
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
// @ts-ignore
import { router } from 'expo-router';
import {
  User,
  Phone,
  Mail,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Car,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  IdCard,
  Heart,
  Circle,
  Truck,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/delivery-auth-store';
import { getWorkerProfile, WorkerProfile, CoworkerInfo } from '../../services/delivery-api';

export default function ProfileScreen() {
  const { worker, employeeDetail } = useAuthStore();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await getWorkerProfile(worker?.id);

      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        setError(result.message || 'Алдаа гарлаа');
      }
    } catch {
      setError('Сүлжээний алдаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [worker?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Get initials from name
  const userInitials = useMemo(() => {
    const name = profile?.worker?.name || worker?.name || 'Х';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [profile?.worker?.name, worker?.name]);

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Уншиж байна...</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Дахин оролдох</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emp = profile?.employee;
  const w = profile?.worker;
  const car = profile?.car;
  const coworkers = profile?.coworkers || [];
  const stats = profile?.today_stats;

  const formatPhone = (phone: string) => {
    if (phone.length === 8) {
      return `${phone.slice(0, 4)}-${phone.slice(4)}`;
    }
    return phone;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ====== HEADER — Avatar + Name ====== */}
      <View style={styles.headerCard}>
        <View style={styles.avatarLarge}>
          {(emp?.avatar || w?.avatar) ? (
            <Image source={{ uri: emp?.avatar || w?.avatar || '' }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitialsLarge}>{userInitials}</Text>
          )}
          {/* Status dot */}
          <View style={[styles.statusDot, w?.is_available ? styles.statusOnline : styles.statusOffline]} />
        </View>
        <Text style={styles.headerName}>{w?.name || worker?.name || 'Ажилтан'}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {w?.worker_type_label || worker?.worker_type_label || 'Ажилтан'}
          </Text>
        </View>
        {emp?.department && emp.department !== '-' && (
          <Text style={styles.headerDepartment}>{emp.department}</Text>
        )}
        {emp?.job_position && emp.job_position !== '-' && (
          <View style={styles.jobBadge}>
            <Briefcase size={12} color="#6B7280" />
            <Text style={styles.jobBadgeText}>{emp.job_position}</Text>
          </View>
        )}
      </View>

      {/* ====== PERSONAL INFO ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Хувийн мэдээлэл</Text>
        <View style={styles.card}>
          <InfoRow icon={IdCard} label="Ажилтны код" value={emp?.employee_code || worker?.employee_code} />
          {emp?.last_name && (
            <InfoRow icon={User} label="Овог" value={emp.last_name} />
          )}
          {emp?.first_name && (
            <InfoRow icon={User} label="Нэр" value={emp.first_name} />
          )}
          {emp?.birthday && (
            <InfoRow icon={Calendar} label="Төрсөн өдөр" value={formatDate(emp.birthday)} />
          )}
          {emp?.gender && (
            <InfoRow icon={User} label="Хүйс" value={emp.gender === 'male' ? 'Эрэгтэй' : emp.gender === 'female' ? 'Эмэгтэй' : emp.gender} />
          )}
        </View>
      </View>

      {/* ====== CONTACT INFO ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Холбоо барих</Text>
        <View style={styles.card}>
          {(emp?.mobile_phone || w?.phone) && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${emp?.mobile_phone || w?.phone}`)}>
              <InfoRow
                icon={Phone}
                label="Гар утас"
                value={formatPhone(emp?.mobile_phone || w?.phone || '')}
                highlight
              />
            </TouchableOpacity>
          )}
          {emp?.work_phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${emp.work_phone}`)}>
              <InfoRow icon={Phone} label="Ажлын утас" value={formatPhone(emp.work_phone)} highlight />
            </TouchableOpacity>
          )}
          {emp?.work_email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${emp.work_email}`)}>
              <InfoRow icon={Mail} label="Имэйл" value={emp.work_email} highlight />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ====== WORK INFO ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ажлын мэдээлэл</Text>
        <View style={styles.card}>
          {emp?.department && emp.department !== '-' && (
            <InfoRow icon={Building2} label="Хэлтэс" value={emp.department} />
          )}
          {emp?.job_position && emp.job_position !== '-' && (
            <InfoRow icon={Briefcase} label="Албан тушаал" value={emp.job_position} />
          )}
          {emp?.work_location && (
            <InfoRow icon={MapPin} label="Ажлын байршил" value={emp.work_location} />
          )}
          {emp?.employment_start_date && (
            <InfoRow
              icon={Calendar}
              label="Ажилд орсон"
              value={emp.employment_duration || formatDate(emp.employment_start_date)}
            />
          )}
          <InfoRow
            icon={Circle}
            label="Төлөв"
            value={emp?.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
            valueColor={emp?.is_active ? '#059669' : '#DC2626'}
          />
        </View>
      </View>

      {/* ====== DELIVERY INFO ====== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Хүргэлтийн мэдээлэл</Text>
        <View style={styles.card}>
          <InfoRow icon={Truck} label="Төрөл" value={w?.worker_type_label || 'Тодорхойгүй'} />
          <InfoRow
            icon={Shield}
            label="Төлөв"
            value={w?.is_available ? 'Бэлэн' : 'Завгүй'}
            valueColor={w?.is_available ? '#059669' : '#F59E0B'}
          />
          {w?.license_number && (
            <InfoRow icon={IdCard} label="ЖҮ дугаар" value={w.license_number} />
          )}
          {w?.license_expiry && (
            <InfoRow icon={Calendar} label="ЖҮ хүчинтэй" value={formatDate(w.license_expiry)} />
          )}
        </View>
      </View>

      {/* ====== CAR INFO ====== */}
      {car && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Машины мэдээлэл</Text>
          <TouchableOpacity style={styles.carCard} onPress={() => router.push('/car')} activeOpacity={0.7}>
            {car.image_url ? (
              <Image source={{ uri: car.image_url }} style={styles.carImage} resizeMode="cover" />
            ) : (
              <View style={styles.carImagePlaceholder}>
                <Car size={32} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.carInfo}>
              <Text style={styles.carPlate}>{car.plate}</Text>
              <Text style={styles.carModel}>{car.brand} {car.model}</Text>
              {car.year && <Text style={styles.carYear}>{car.year} он</Text>}
              {car.zones && car.zones.length > 0 && (
                <View style={styles.carZones}>
                  {car.zones.slice(0, 2).map((zone) => (
                    <View key={zone.id} style={styles.zoneBadge}>
                      <Text style={styles.zoneBadgeText}>{zone.name}</Text>
                    </View>
                  ))}
                  {car.zones.length > 2 && (
                    <Text style={styles.moreZones}>+{car.zones.length - 2}</Text>
                  )}
                </View>
              )}
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ====== COWORKERS ====== */}
      {coworkers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хамт ажиллагчид ({coworkers.length})</Text>
          <View style={styles.card}>
            {coworkers.map((cw, idx) => (
              <View key={cw.id} style={[styles.coworkerRow, idx !== coworkers.length - 1 && styles.coworkerBorder]}>
                <View style={styles.coworkerAvatar}>
                  {cw.avatar ? (
                    <Image source={{ uri: cw.avatar }} style={styles.coworkerAvatarImg} />
                  ) : (
                    <Text style={styles.coworkerInitials}>
                      {cw.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.coworkerInfo}>
                  <Text style={styles.coworkerName}>{cw.name}</Text>
                  <Text style={styles.coworkerType}>{cw.worker_type_label || 'Ажилтан'}</Text>
                </View>
                {cw.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${cw.phone}`)}
                    style={styles.coworkerPhone}
                  >
                    <Phone size={16} color="#2563EB" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ====== TODAY STATS ====== */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Өнөөдрийн статистик</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Нийт" value={stats.total_orders} color="#2563EB" icon={Package} />
            <StatCard label="Хүргэсэн" value={stats.delivered} color="#059669" icon={CheckCircle2} />
            <StatCard label="Явж буй" value={stats.in_progress} color="#F59E0B" icon={Clock} />
            <StatCard label="Амжилтгүй" value={stats.failed} color="#DC2626" icon={AlertTriangle} />
          </View>
          {stats.total_amount > 0 && (
            <View style={styles.amountRow}>
              <View style={styles.amountItem}>
                <Text style={styles.amountLabel}>Нийт дүн</Text>
                <Text style={styles.amountValue}>{formatCurrency(stats.total_amount)}</Text>
              </View>
              <View style={[styles.amountItem, styles.amountItemRight]}>
                <Text style={styles.amountLabel}>Хүргэсэн</Text>
                <Text style={[styles.amountValue, { color: '#059669' }]}>{formatCurrency(stats.delivered_amount)}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ====== EMERGENCY CONTACT ====== */}
      {(emp?.emergency_contact || emp?.emergency_phone) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Яаралтай холбоо барих</Text>
          <View style={styles.emergencyCard}>
            <Heart size={20} color="#DC2626" />
            <View style={styles.emergencyInfo}>
              {emp.emergency_contact && (
                <Text style={styles.emergencyName}>{emp.emergency_contact}</Text>
              )}
              {emp.emergency_phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${emp.emergency_phone}`)}>
                  <Text style={styles.emergencyPhone}>{formatPhone(emp.emergency_phone)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ========== HELPER COMPONENTS ==========

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
  valueColor,
}: {
  icon: any;
  label: string;
  value?: string | null;
  highlight?: boolean;
  valueColor?: string;
}) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconContainer}>
        <Icon size={16} color="#6B7280" />
      </View>
      <Text style={infoStyles.label}>{label}</Text>
      <Text
        style={[
          infoStyles.value,
          highlight && infoStyles.valueHighlight,
          valueColor ? { color: valueColor } : undefined,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
}) {
  return (
    <View style={[statStyles.card, { borderLeftColor: color }]}>
      <View style={[statStyles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={16} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ========== HELPERS ==========

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('mn-MN') + '₮';
}

// ========== STYLES ==========

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  value: {
    fontSize: 13,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
    maxWidth: '50%',
    textAlign: 'right',
  },
  valueHighlight: {
    color: '#2563EB',
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  label: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },

  // Header
  headerCard: {
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    marginBottom: 14,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitialsLarge: {
    fontSize: 28,
    fontFamily: 'GIP-Bold',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  statusOnline: {
    backgroundColor: '#22C55E',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  headerName: {
    fontSize: 20,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  headerBadge: {
    marginTop: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: 'GIP-SemiBold',
    color: '#2563EB',
  },
  headerDepartment: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 6,
  },
  jobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  jobBadgeText: {
    fontSize: 12,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#374151',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // Car
  carCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  carImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  carImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carInfo: {
    flex: 1,
    marginLeft: 14,
  },
  carPlate: {
    fontSize: 16,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  carModel: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
    marginTop: 2,
  },
  carYear: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#9CA3AF',
    marginTop: 1,
  },
  carZones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  zoneBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoneBadgeText: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#92400E',
  },
  moreZones: {
    fontSize: 10,
    fontFamily: 'GIP-Medium',
    color: '#9CA3AF',
  },

  // Coworkers
  coworkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  coworkerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  coworkerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coworkerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  coworkerInitials: {
    fontSize: 14,
    fontFamily: 'GIP-Bold',
    color: '#4F46E5',
  },
  coworkerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  coworkerName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#111827',
  },
  coworkerType: {
    fontSize: 12,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  coworkerPhone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  amountItem: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  amountItemRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 15,
    fontFamily: 'GIP-Bold',
    color: '#111827',
    marginTop: 2,
  },

  // Emergency
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyName: {
    fontSize: 14,
    fontFamily: 'GIP-SemiBold',
    color: '#991B1B',
  },
  emergencyPhone: {
    fontSize: 13,
    fontFamily: 'GIP-Medium',
    color: '#DC2626',
    marginTop: 2,
  },
});
