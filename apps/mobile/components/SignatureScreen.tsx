/**
 * ГАРЫН ҮСГИЙН ДЭЛГЭЦ
 * 
 * Хүлээн авсан хүний гарын үсэг авах
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  Check,
  X,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SignatureScreenProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
}

interface Point {
  x: number;
  y: number;
}

export default function SignatureScreen({ onSave, onCancel }: SignatureScreenProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');

  const handleTouchStart = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath(`M${locationX.toFixed(0)},${locationY.toFixed(0)}`);
  };

  const handleTouchMove = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath(prev => `${prev} L${locationX.toFixed(0)},${locationY.toFixed(0)}`);
  };

  const handleTouchEnd = () => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath('');
    }
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaths([]);
    setCurrentPath('');
  };

  const handleSave = async () => {
    if (paths.length === 0) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Return SVG path data as base64
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN_WIDTH - 40}" height="300" viewBox="0 0 ${SCREEN_WIDTH - 40} 300">
      ${paths.map(p => `<path d="${p}" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    </svg>`;
    
    try {
      // Simple base64 encoding for React Native
      const base64 = btoa(unescape(encodeURIComponent(svgData)));
      onSave(`data:image/svg+xml;base64,${base64}`);
    } catch (error) {
      // Fallback: just return the path data
      onSave(`svg:${paths.join('|')}`);
    }
  };

  const hasSignature = paths.length > 0 || currentPath.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Гарын үсэг</Text>
        <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
          <RotateCcw size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Доорх талбарт гарын үсгээ зурна уу
        </Text>
      </View>

      <View
        style={styles.canvas}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {paths.map((path, index) => (
            <Path
              key={index}
              d={path}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath && (
            <Path
              d={currentPath}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>

        {!hasSignature && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Гарын үсэг</Text>
          </View>
        )}

        {/* Signature line */}
        <View style={styles.signatureLine} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <X size={20} color="#6B7280" />
          <Text style={styles.cancelButtonText}>Цуцлах</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !hasSignature && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasSignature}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Хадгалах</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'GIP-Bold',
    color: '#111827',
  },
  instructions: {
    padding: 16,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'GIP-Regular',
    color: '#6B7280',
  },
  canvas: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    fontSize: 24,
    fontFamily: 'GIP-Regular',
    color: '#E5E7EB',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-Medium',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#e17100',
    borderRadius: 10,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'GIP-SemiBold',
    color: '#FFFFFF',
  },
});
