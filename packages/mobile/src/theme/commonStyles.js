import { StyleSheet } from 'react-native';
import { COLORS } from './colors';

export const commonStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inputError: {
    borderWidth: 1,
    borderColor: COLORS.statusDanger,
  },
  errorLabel: {
    color: COLORS.statusDanger,
    fontSize: 11,
    marginTop: 2,
  },
  subHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
});
