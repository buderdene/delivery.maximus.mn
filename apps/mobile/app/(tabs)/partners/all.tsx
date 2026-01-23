/**
 * БҮХ ХАРИЛЦАГЧИД ДЭЛГЭЦ
 * 
 * BUSINESS RULE:
 * - Борлуулагчийн маршрутын бүх харилцагчдыг жагсаана
 * - Хуудаслалт: 20 харилцагч/хуудас (Infinite Scroll)
 * - 1C хайлт: name, companyCode талбараар шууд 1C ERP руу лавлана
 * 
 * API:
 * - 1C ERP: /hs/cl/Companies?routeId={routeId}&page={page}&pageSize=20
 * - Хайлт: /hs/cl/Companies?name={query} ЭСВЭЛ ?companyCode={query}
 * 
 * ОНЦЛОГ:
 * - Гараг сонголт байхгүй (бүх өдрийн харилцагч)
 * - Infinite scroll (доош гүйлгэхэд автоматаар дараагийн 20 харилцагч)
 * - Локал хайлт + 1C хайлт хоёулаа ажиллана
 */

import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, TextInput, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Linking, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { 
  Users, Search, MapPin, Phone, ChevronLeft,
  Wallet, AlertCircle, RefreshCw, ImageIcon
} from 'lucide-react-native';
import { What3WordsIcon } from '../../../components/icons/What3WordsIcon';
import { 
  Box, VStack, HStack, Text, Heading, Pressable, 
  Button, ButtonText
} from '../../../components/ui';
import { usePartnerStore } from '../../../stores/partner-store';
import { useAuthStore } from '../../../stores/auth-store';
import type { Partner, PartnerTabType } from '../../../types/partner';

/**
 * PartnerCard: Харилцагчийн мэдээлэл харуулах карт - Compact Design
 * 
 * BUSINESS RULE - Ирсэн/Зай хол тодорхойлох:
 * 1. coordinateRange === 1 → "Ирсэн" (GPS шалгахгүй)
 * 2. coordinateRange !== 1 → GPS зайг routeRange-тэй харьцуулах
 */
function PartnerCard({ partner, onPress, routeRangeKm, index }: { partner: Partner; onPress: () => void; routeRangeKm: number; index: number }) {
  const isCoordinateFree = partner.coordinateRange === 1;
  const isNearby = isCoordinateFree || (partner.distance !== undefined && partner.distance <= routeRangeKm);
  const distanceLabel = isCoordinateFree ? 'Ирсэн' : (isNearby ? 'Ойрхон' : 'Зай хол');

  const formatBalance = (balance?: number | null) => {
    if (!balance) return null;
    return balance.toLocaleString() + '₮';
  };

  const openW3W = () => {
    if (partner.w3w) {
      Linking.openURL(`https://what3words.com/${partner.w3w}`);
    }
  };

  const displayAddress = partner.address || [partner.city, partner.street1, partner.street2].filter(Boolean).join(' ');

  return (
    <Pressable onPress={onPress}>
      <Box className="bg-white border-b border-outline-100" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {/* Row 1: Index + Status badge + Partner name + Code + Image */}
        <HStack className="items-start justify-between" style={{ marginBottom: 8 }}>
          {/* Index Number */}
          <Box style={{ 
            width: 28, 
            height: 28, 
            borderRadius: 14, 
            backgroundColor: '#EFF6FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            marginTop: 2,
          }}>
            <Text style={{ fontSize: 12, fontFamily: 'GIP-Bold', color: '#2563EB' }}>
              {index}
            </Text>
          </Box>
          
          <VStack className="flex-1" style={{ marginRight: 12 }}>
            {/* Status Badge */}}
            <Box 
              style={{ 
                paddingHorizontal: 8, 
                paddingVertical: 2, 
                borderRadius: 4,
                alignSelf: 'flex-start',
                marginBottom: 4,
                backgroundColor: isNearby ? '#DCFCE7' : '#FEE2E2',
              }}
            >
              <Text 
                size="xs" 
                style={{ 
                  fontFamily: 'GIP-Medium',
                  color: isNearby ? '#16A34A' : '#DC2626',
                }}
              >
                {distanceLabel}
              </Text>
            </Box>
            
            {/* Partner Name */}
            <Text 
              size="md" 
              style={{ fontFamily: 'GIP-SemiBold', color: '#111827' }} 
              numberOfLines={1}
            >
              {partner.name}
            </Text>
            
            {/* Code after name */}
            {partner.companyCode && (
              <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#6B7280', marginTop: 2 }}>
                Код: {partner.companyCode}
              </Text>
            )}
          </VStack>
          
          {/* Image + Status below */}
          <VStack style={{ alignItems: 'center' }}>
            <Box style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 8, 
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}>
              {partner.image ? (
                <Image 
                  source={{ uri: partner.image }} 
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                />
              ) : (
                <ImageIcon size={20} color="#9CA3AF" />
              )}
            </Box>
          </VStack>
        </HStack>
        
        {/* Row 2: RD only */}
        {partner.headCompanyRegister && (
          <HStack style={{ marginBottom: 6, gap: 16 }}>
            <HStack style={{ gap: 4, alignItems: 'center' }}>
              <Text size="xs" style={{ fontFamily: 'GIP-Medium', color: '#6B7280' }}>РД:</Text>
              <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#374151' }}>{partner.headCompanyRegister}</Text>
            </HStack>
          </HStack>
        )}
        
        {/* Row 3: Phone + W3W + Balance */}
        <HStack className="items-center" style={{ gap: 12, flexWrap: 'wrap' }}>
          {partner.phone && (
            <HStack style={{ gap: 4, alignItems: 'center' }}>
              <Phone size={12} color="#2563EB" />
              <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#374151' }}>{partner.phone}</Text>
            </HStack>
          )}
          
          {partner.w3w && (
            <TouchableOpacity onPress={openW3W}>
              <HStack style={{ gap: 4, alignItems: 'center' }}>
                <What3WordsIcon size={12} />
                <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#E11D48' }}>{partner.w3w}</Text>
              </HStack>
            </TouchableOpacity>
          )}
          
          {partner.balance !== null && partner.balance !== 0 && (
            <HStack style={{ gap: 4, alignItems: 'center' }}>
              <Wallet size={12} color="#e17100" />
              <Text size="xs" style={{ fontFamily: 'GIP-Medium', color: '#e17100' }}>
                {formatBalance(partner.balance)}
              </Text>
            </HStack>
          )}
        </HStack>
        
        {/* Row 4: Address (if exists) */}
        {displayAddress && (
          <HStack style={{ marginTop: 6, gap: 4 }} className="items-start">
            <MapPin size={12} color="#9CA3AF" style={{ marginTop: 2 }} />
            <Text size="xs" style={{ fontFamily: 'GIP-Regular', color: '#6B7280', flex: 1 }} numberOfLines={1}>
              {displayAddress}
            </Text>
          </HStack>
        )}
      </Box>
    </Pressable>
  );
}

export default function AllPartnersScreen() {
  const router = useRouter();
  const { 
    partners,
    isLoading,
    isLoadingMore,
    hasMore,
    error, 
    filters,
    totalRecords,
    searchResults,
    isSearching,
    searchQuery,
    fetchPartners, 
    loadMore,
    searchPartners,
    clearSearch,
    setTab,
    setUserLocation,
    selectPartner,
    getFilteredPartners,
    getTabCounts,
  } = usePartnerStore();

  const { erpDetails } = useAuthStore();
  const routeRangeKm = (parseInt(erpDetails?.[0]?.routeRange || '2000', 10)) / 1000;

  const [searchInput, setSearchInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (err) {
        console.log('Location error:', err);
      }
    };
    getLocation();
  }, []);

  useEffect(() => {
    if (partners.length === 0) {
      fetchPartners();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length >= 2) {
        searchPartners(searchInput);
      } else if (searchInput.length === 0) {
        clearSearch();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearSearch();
    setSearchInput('');
    await fetchPartners();
    setRefreshing(false);
  }, [fetchPartners, clearSearch]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore && !isSearching && searchQuery.length < 2) {
      loadMore();
    }
  };

  const handlePartnerPress = (partner: Partner) => {
    selectPartner(partner);
    router.push(`/partner/${partner.id}`);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    clearSearch();
  };

  const isSearchMode = searchQuery.length >= 2;
  const displayPartners = isSearchMode ? searchResults : getFilteredPartners();
  const tabCounts = getTabCounts();

  const tabs: { key: PartnerTabType; label: string }[] = [
    { key: 'all', label: 'Бүгд' },
    { key: 'visited', label: 'Ирсэн' },
    { key: 'far', label: 'Зай хол' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Box className="flex-1 bg-background-50">
        {/* Header */}
        <Box className="bg-white px-4 pt-2 pb-3 border-b border-outline-100">
        <HStack className="items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <Heading size="lg" className="text-typography-900 flex-1">
            Бүх харилцагч
          </Heading>
          <HStack space="xs" className="items-center">
            <Users size={18} color="#2563EB" />
            <Text size="sm" className="text-primary-600 font-medium">
              {totalRecords}
            </Text>
          </HStack>
        </HStack>

        {/* Status Tabs */}
        <HStack space="md">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setTab(tab.key)}
              style={[
                styles.statusTab,
                filters.tab === tab.key && styles.activeStatusTab,
              ]}
            >
              <Text
                size="sm"
                style={{ fontFamily: filters.tab === tab.key ? 'GIP-Medium' : 'GIP-Regular' }}
                className={filters.tab === tab.key ? 'text-typography-900' : 'text-typography-500'}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </HStack>
      </Box>

      {/* Search Bar */}
      <Box className="bg-white px-4 py-3 border-b border-outline-100">
        <Box style={styles.searchContainer}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#2563EB" style={styles.searchIcon} />
          ) : (
            <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          )}
          <TextInput
            style={styles.searchInput}
            placeholder="Нэр, код, регистрээр хайх"
            placeholderTextColor="#9CA3AF"
            value={searchInput}
            onChangeText={setSearchInput}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Text size="sm" className="text-primary-600">Цэвэрлэх</Text>
            </TouchableOpacity>
          )}
        </Box>
      </Box>

      {/* Error State */}
      {error && (
        <Box className="mx-4 mt-2 bg-error-50 p-4 rounded-xl border border-error-200">
          <HStack space="sm" className="items-center">
            <AlertCircle size={20} color="#DC2626" />
            <Text size="sm" className="text-error-600 flex-1">{error}</Text>
            <TouchableOpacity onPress={() => fetchPartners()}>
              <RefreshCw size={20} color="#DC2626" />
            </TouchableOpacity>
          </HStack>
        </Box>
      )}

      {/* Loading State */}
      {isLoading && partners.length === 0 ? (
        <Box className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text size="md" className="text-typography-500 mt-4">
            Харилцагч татаж байна...
          </Text>
        </Box>
      ) : (
        <FlatList
          data={displayPartners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <HStack className="items-center justify-between mb-3">
              <Text size="sm" className="text-typography-500">
                {isSearchMode 
                  ? `${displayPartners.length} олдсон`
                  : `${displayPartners.length} / ${totalRecords} харилцагч`
                }
              </Text>
              {isLoading && (
                <ActivityIndicator size="small" color="#2563EB" />
              )}
            </HStack>
          }
          renderItem={({ item: partner, index }) => (
            <PartnerCard
              partner={partner}
              routeRangeKm={routeRangeKm}
              onPress={() => handlePartnerPress(partner)}
              index={index + 1}
            />
          )}
          ListFooterComponent={
            isLoading && partners.length > 0 ? (
              <Box className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563EB" />
                <Text size="sm" className="text-typography-500 mt-2">
                  Дараагийн хуудас...
                </Text>
              </Box>
            ) : null
          }
          ListEmptyComponent={
            !isLoading && !isSearching ? (
              <Box className="flex-1 justify-center items-center py-20">
                <Box className="bg-primary-50 p-6 rounded-full mb-4">
                  <Users size={48} color="#2563EB" />
                </Box>
                <Heading size="lg" className="text-typography-700 text-center">
                  Харилцагч олдсонгүй
                </Heading>
                <Text size="md" className="text-typography-500 text-center mt-2 px-8">
                  {searchInput ? 'Хайлтын үр дүн олдсонгүй' : 'Харилцагчийн жагсаалт хоосон байна'}
                </Text>
                <Button
                  size="md"
                  variant="outline"
                  action="primary"
                  onPress={onRefresh}
                  className="mt-4"
                >
                  <RefreshCw size={16} color="#2563EB" />
                  <ButtonText className="ml-2">Дахин татах</ButtonText>
                </Button>
              </Box>
            ) : null
          }
        />
      )}
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statusTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeStatusTab: {
    backgroundColor: '#DBEAFE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'GIP-Regular',
  },
});
