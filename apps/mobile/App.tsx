import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Box, Text, Center } from '@gluestack-ui/themed';

export default function App() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider config={config}>
        <Center flex={1} bg="$backgroundLight0">
          <Box p="$4">
            <Text size="xl" bold>Sales Maximus Mobile</Text>
            <Text size="sm" color="$textLight500">Powered by Gluestack UI</Text>
          </Box>
          <StatusBar style="auto" />
        </Center>
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
