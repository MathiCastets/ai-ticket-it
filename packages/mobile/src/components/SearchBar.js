import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function SearchBar({
  value = '',
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  inputStyle,
}) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search" size={18} color={COLORS.textMuted} />
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          onPress={() => onChangeText('')}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 9,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
});
