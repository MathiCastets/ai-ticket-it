import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export const formatearFechaEvento = (fecha) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(fecha);

const mismoDia = (primera, segunda) =>
  primera.getFullYear() === segunda.getFullYear() &&
  primera.getMonth() === segunda.getMonth() &&
  primera.getDate() === segunda.getDate();

export default function DateTimeSelector({
  value,
  onChange,
  error,
  disabled = false,
  accessibilityLabel = 'Elegir fecha y horario del evento',
  allowPastDates = false,
  dateOnly = false,
  placeholder = 'Elegí fecha y horario',
}) {
  const [visible, setVisible] = useState(false);
  const [fechaBorrador, setFechaBorrador] = useState(null);
  const [mesVisible, setMesVisible] = useState(() => new Date());
  const [horaBorrador, setHoraBorrador] = useState('');
  const [minutoBorrador, setMinutoBorrador] = useState('');
  const [errorSelector, setErrorSelector] = useState('');

  const abrirSelector = () => {
    const ahora = new Date();
    setFechaBorrador(value || null);
    setMesVisible(value || ahora);
    setHoraBorrador(value ? String(value.getHours()).padStart(2, '0') : '');
    setMinutoBorrador(value ? String(value.getMinutes()).padStart(2, '0') : '');
    setErrorSelector('');
    setVisible(true);
  };

  const confirmarFecha = () => {
    if (dateOnly) {
      if (!fechaBorrador) {
        setErrorSelector('Seleccioná un día del calendario.');
        return;
      }

      onChange(
        new Date(
          fechaBorrador.getFullYear(),
          fechaBorrador.getMonth(),
          fechaBorrador.getDate()
        )
      );
      setVisible(false);
      return;
    }

    const hora = Number(horaBorrador);
    const minuto = Number(minutoBorrador);
    if (!fechaBorrador) {
      setErrorSelector('Seleccioná un día del calendario.');
      return;
    }
    if (
      horaBorrador.trim() === '' ||
      minutoBorrador.trim() === '' ||
      !Number.isInteger(hora) ||
      hora < 0 ||
      hora > 23 ||
      !Number.isInteger(minuto) ||
      minuto < 0 ||
      minuto > 59
    ) {
      setErrorSelector('Ingresá una hora válida entre 00:00 y 23:59.');
      return;
    }

    const fechaCompleta = new Date(
      fechaBorrador.getFullYear(),
      fechaBorrador.getMonth(),
      fechaBorrador.getDate(),
      hora,
      minuto
    );
    if (fechaCompleta.getTime() <= Date.now()) {
      setErrorSelector('La fecha y hora deben ser posteriores al momento actual.');
      return;
    }

    onChange(fechaCompleta);
    setVisible(false);
  };

  const hoy = new Date();
  const diasDelMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  const primerDiaDelMes = new Date(
    mesVisible.getFullYear(),
    mesVisible.getMonth(),
    1
  ).getDay();
  const celdasCalendario = Array.from({ length: 42 }, (_, indice) => {
    const dia = indice - primerDiaDelMes + 1;
    return dia > 0 && dia <= diasDelMes ? dia : null;
  });

  return (
    <>
      <View style={styles.fieldGroup}>
        <TouchableOpacity
          style={[styles.datePickerButton, error && styles.inputError]}
          onPress={abrirSelector}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Text style={[styles.datePickerText, !value && styles.placeholder]}>
            {value
              ? dateOnly
                ? value.toLocaleDateString('es-AR')
                : formatearFechaEvento(value)
              : placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={COLORS.tertiary} />
        </TouchableOpacity>
        {error ? <Text style={styles.errorLabel}>{error}</Text> : null}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dateModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {dateOnly ? 'Elegir fecha' : 'Fecha y horario'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {dateOnly
                    ? 'Seleccioná un día del calendario.'
                    : 'Seleccioná el día y la hora.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar calendario"
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={styles.monthArrow}
                onPress={() =>
                  setMesVisible(
                    (actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1)
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {new Intl.DateTimeFormat('es-AR', {
                  month: 'long',
                  year: 'numeric',
                }).format(mesVisible)}
              </Text>
              <TouchableOpacity
                style={styles.monthArrow}
                onPress={() =>
                  setMesVisible(
                    (actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1)
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
              >
                <Ionicons name="chevron-forward" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {DIAS_SEMANA.map((dia) => (
                <Text key={`weekday-${dia}`} style={styles.weekday}>
                  {dia}
                </Text>
              ))}
              {celdasCalendario.map((dia, indice) => {
                const fechaDia =
                  dia === null
                    ? null
                    : new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia);
                const pasado =
                  !allowPastDates && fechaDia && !mismoDia(fechaDia, hoy) && fechaDia < hoy;
                const seleccionado =
                  dia !== null &&
                  fechaBorrador?.getFullYear() === mesVisible.getFullYear() &&
                  fechaBorrador?.getMonth() === mesVisible.getMonth() &&
                  fechaBorrador?.getDate() === dia;
                return (
                  <TouchableOpacity
                    key={`day-${indice}`}
                    style={[
                      styles.calendarDay,
                      seleccionado && styles.calendarDaySelected,
                    ]}
                    disabled={dia === null || pasado}
                    onPress={() => {
                      setFechaBorrador(fechaDia);
                      setErrorSelector('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      dia === null
                        ? undefined
                        : `${dia} de ${new Intl.DateTimeFormat('es-AR', {
                            month: 'long',
                          }).format(mesVisible)}`
                    }
                    accessibilityState={{ selected: seleccionado, disabled: !!pasado }}
                  >
                    {dia !== null ? (
                      <Text
                        style={[
                          styles.calendarDayText,
                          pasado && styles.calendarDayPastText,
                          seleccionado && styles.calendarDayTextSelected,
                        ]}
                      >
                        {dia}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {!dateOnly ? (
              <>
                <Text style={styles.timeLabel}>Hora</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={horaBorrador}
                    onChangeText={(text) => {
                      setHoraBorrador(text.replace(/\D/g, '').slice(0, 2));
                      setErrorSelector('');
                    }}
                    placeholder="HH"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Hora de inicio, de 00 a 23"
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={minutoBorrador}
                    onChangeText={(text) => {
                      setMinutoBorrador(text.replace(/\D/g, '').slice(0, 2));
                      setErrorSelector('');
                    }}
                    placeholder="MM"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Minutos, de 00 a 59"
                  />
                </View>
              </>
            ) : null}
            {errorSelector ? <Text style={styles.errorLabel}>{errorSelector}</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={confirmarFecha}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 4 },
  datePickerButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  datePickerText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  placeholder: { color: COLORS.textMuted },
  inputError: { borderWidth: 1, borderColor: COLORS.statusDanger },
  errorLabel: { color: COLORS.statusDanger, fontSize: 11, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: 20,
  },
  dateModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surfaceCard,
    borderColor: COLORS.borderGlass,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  monthArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  monthTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.2857%',
    paddingVertical: 8,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  calendarDaySelected: { backgroundColor: COLORS.accentElectric },
  calendarDayText: { color: COLORS.textSecondary, fontSize: 12 },
  calendarDayPastText: { color: COLORS.textMuted, opacity: 0.4 },
  calendarDayTextSelected: { color: COLORS.textPrimary, fontWeight: '800' },
  timeLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 7,
  },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    width: 64,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
    backgroundColor: COLORS.surfaceContainerLow,
    color: COLORS.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
  timeSeparator: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accentElectric,
    borderRadius: 22,
  },
  primaryButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 22,
  },
  secondaryButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
});
