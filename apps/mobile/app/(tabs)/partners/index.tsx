import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, Route, ChevronRight } from 'lucide-react-native';
import { Box, VStack, HStack, Text, Heading } from '../../../components/ui';

export default function PartnersIndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Box className="flex-1 bg-background-50">
        {/* Header */}
        <Box className="bg-white px-4 pt-2 pb-4 border-b border-outline-100">
          <Heading size="xl" className="text-typography-900">
            Харилцагчид
          </Heading>
          <Text size="sm" className="text-typography-500 mt-1">
            Харилцагчдын жагсаалт сонгох
          </Text>
        </Box>

        {/* Options */}
        <VStack space="md" className="p-4">
          {/* Route Partners */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => router.push('/(tabs)/partners/route')}
          >
            <HStack space="md" className="items-center">
              <Box className="w-14 h-14 bg-amber-100 rounded-xl items-center justify-center">
                <Route size={28} color="#F59E0B" />
              </Box>
              <VStack className="flex-1">
                <Text size="lg" className="text-typography-900 font-semibold">
                  Маршрутын харилцагчид
                </Text>
                <Text size="sm" className="text-typography-500">
                  Өдөр бүрийн маршрутын дагуу
                </Text>
              </VStack>
              <ChevronRight size={24} color="#9CA3AF" />
            </HStack>
          </TouchableOpacity>

          {/* All Partners */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => router.push('/(tabs)/partners/all')}
          >
            <HStack space="md" className="items-center">
              <Box className="w-14 h-14 bg-primary-100 rounded-xl items-center justify-center">
                <Users size={28} color="#2563EB" />
              </Box>
              <VStack className="flex-1">
                <Text size="lg" className="text-typography-900 font-semibold">
                  Бүх харилцагч
                </Text>
                <Text size="sm" className="text-typography-500">
                  Бүх харилцагчдыг хайх, үзэх
                </Text>
              </VStack>
              <ChevronRight size={24} color="#9CA3AF" />
            </HStack>
          </TouchableOpacity>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
