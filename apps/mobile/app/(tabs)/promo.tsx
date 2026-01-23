import React from 'react';
import { ScrollView } from 'react-native';
import { Percent, Gift, Tag, Clock } from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading, Pressable } from '../../components/ui';

export default function PromoScreen() {
  const promos = [
    {
      id: 1,
      title: '10% хямдрал',
      description: '100,000₮-с дээш худалдан авалтад',
      validUntil: '2026-01-31',
      type: 'discount',
    },
    {
      id: 2,
      title: '1+1 урамшуулал',
      description: 'Сонгогдсон бүтээгдэхүүнүүдэд',
      validUntil: '2026-02-15',
      type: 'bundle',
    },
    {
      id: 3,
      title: 'Бэлэг урамшуулал',
      description: '500,000₮-с дээш захиалгад бэлэг',
      validUntil: '2026-01-20',
      type: 'gift',
    },
  ];

  const getPromoIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <Percent size={24} color="#2563EB" />;
      case 'bundle':
        return <Tag size={24} color="#e17100" />;
      case 'gift':
        return <Gift size={24} color="#D97706" />;
      default:
        return <Percent size={24} color="#2563EB" />;
    }
  };

  const getPromoBgColor = (type: string) => {
    switch (type) {
      case 'discount':
        return 'bg-primary-50';
      case 'bundle':
        return 'bg-success-50';
      case 'gift':
        return 'bg-warning-50';
      default:
        return 'bg-primary-50';
    }
  };

  return (
    <Box className="flex-1 bg-background-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <VStack space="md">
          {promos.map((promo) => (
            <Pressable key={promo.id}>
              <Box className="bg-white rounded-2xl p-4 border border-outline-100">
                <HStack space="md" className="items-start">
                  <Box className={`${getPromoBgColor(promo.type)} p-3 rounded-xl`}>
                    {getPromoIcon(promo.type)}
                  </Box>
                  <VStack className="flex-1" space="xs">
                    <Heading size="md" className="text-typography-900">
                      {promo.title}
                    </Heading>
                    <Text size="sm" className="text-typography-600">
                      {promo.description}
                    </Text>
                    <HStack space="xs" className="items-center mt-2">
                      <Clock size={14} color="#9CA3AF" />
                      <Text size="xs" className="text-typography-400">
                        {promo.validUntil} хүртэл
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            </Pressable>
          ))}
        </VStack>

        {/* Empty state if no promos */}
        {promos.length === 0 && (
          <Box className="flex-1 justify-center items-center py-20">
            <Box className="bg-primary-50 p-6 rounded-full mb-4">
              <Percent size={48} color="#2563EB" />
            </Box>
            <Heading size="lg" className="text-typography-700 text-center">
              Промо урамшуулал байхгүй
            </Heading>
            <Text size="md" className="text-typography-500 text-center mt-2">
              Одоогоор идэвхтэй урамшуулал байхгүй байна
            </Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}
