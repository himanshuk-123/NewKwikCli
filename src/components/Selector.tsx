import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/Colors';

type SelectorProps = {
  keyText: string;
  valueText?: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

const Selector = ({
  keyText,
  valueText,
  onPress,
  disabled = false,
}: SelectorProps) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.containerDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.keyContainer}>
        <Text style={styles.keyText}>{keyText}</Text>
      </View>
      <View style={styles.valueContainer}>
        {valueText ? (
          <Text style={styles.valueText}>{valueText}</Text>
        ) : (
          <Text style={styles.placeholderText}>Select</Text>
        )}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  keyContainer: {
    flex: 1,
    paddingRight: 10,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '55%',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  arrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});

export default Selector;
