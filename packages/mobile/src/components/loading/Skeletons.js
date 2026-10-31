import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../../theme/colors';

export function Skeleton({ width = '100%', height = 14, borderRadius = 8, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]} accessible={false}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-180, 240],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

export function EventCardSkeleton() {
  return (
    <View style={styles.eventListCard}>
      <Skeleton height={190} borderRadius={0} />
      <View style={styles.eventListCardContent}>
        <Skeleton width="72%" height={18} />
        <Skeleton width="62%" height={12} />
        <Skeleton width="78%" height={12} />
        <View style={styles.row}>
          <Skeleton width="42%" height={12} />
          <Skeleton width="32%" height={12} />
        </View>
      </View>
    </View>
  );
}

export function EventListSkeleton({ count = 3 }) {
  return (
    <View style={styles.eventList}>
      {Array.from({ length: count }, (_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function TicketCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={112} borderRadius={12} />
      <View style={styles.ticketContent}>
        <Skeleton width="48%" height={20} />
        <View style={styles.ticketRow}>
          <Skeleton width={64} height={64} borderRadius={12} />
          <View style={styles.flexContent}>
            <Skeleton width="90%" height={14} />
            <Skeleton width="72%" height={12} />
            <Skeleton width="54%" height={12} />
          </View>
        </View>
        <View style={styles.row}>
          <Skeleton width="42%" height={36} borderRadius={12} />
          <Skeleton width="42%" height={36} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function TicketListSkeleton({ count = 2 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <TicketCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function ConversationRowSkeleton() {
  return (
    <View style={styles.conversationCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.flexContent}>
        <View style={styles.spaceBetween}>
          <Skeleton width="46%" height={14} />
          <Skeleton width="20%" height={10} />
        </View>
        <Skeleton width="72%" height={11} />
        <Skeleton width="92%" height={12} />
      </View>
    </View>
  );
}

export function ConversationListSkeleton({ count = 3 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <ConversationRowSkeleton key={index} />
      ))}
    </View>
  );
}

export function EventDetailSkeleton() {
  return (
    <View style={styles.detailSkeleton}>
      <Skeleton height={210} borderRadius={0} />
      <View style={styles.detailContent}>
        <Skeleton width="34%" height={18} />
        <Skeleton width="78%" height={24} />
        <Skeleton height={58} borderRadius={14} />
        <Skeleton height={58} borderRadius={14} />
        <Skeleton height={84} borderRadius={14} />
        <View style={styles.detailSection}>
          <Skeleton width="54%" height={18} />
          <Skeleton height={82} borderRadius={14} />
          <Skeleton height={82} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    backgroundColor: '#23183D',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
    backgroundColor: 'rgba(32, 217, 249, 0.16)',
  },
  list: {
    gap: 12,
  },
  eventList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eventListCard: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eventListCardContent: {
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ticketContent: {
    gap: 14,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flexContent: {
    flex: 1,
    gap: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailSkeleton: {
    gap: 0,
  },
  detailContent: {
    padding: 16,
    gap: 14,
  },
  detailSection: {
    gap: 12,
    marginTop: 8,
  },
});
