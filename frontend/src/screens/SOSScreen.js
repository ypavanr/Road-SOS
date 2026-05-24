import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Vibration, ScrollView, Dimensions, Platform,
  StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getLocationData } from '../services/locationService';
import { sendSOSViaTelegram, sendLocationPin } from '../services/telegramService';
import { sendSOSViaSMS } from '../services/smsService';
import { selectPhotoSource } from '../services/photoPickerService';
import { COUNTDOWN_SECONDS, POLICE_PHONE, FIRE_PHONE, TRAUMA_PHONE, HOSPITAL_PHONE } from '../config/config';
import { API_GATEWAY_URL } from '../../config';

const { width } = Dimensions.get('window');
const STATUS = { IDLE: 'IDLE', COUNTDOWN: 'COUNTDOWN', SENDING: 'SENDING', SENT: 'SENT', ERROR: 'ERROR' };

// ── Channel status badge ────────────────────────────────────────────────────
const ChannelBadge = ({ icon, label, state }) => {
  const color = state === 'ok'      ? '#22C55E'
              : state === 'error'   ? '#EF4444'
              : state === 'sending' ? '#F59E0B'
              : '#333';
  const iconName = state === 'ok'      ? 'checkmark-circle'
                 : state === 'error'   ? 'close-circle'
                 : state === 'sending' ? 'time'
                 : 'ellipse-outline';
  return (
    <View style={[badge.wrap, { borderColor: color + '55' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 5 }} />
      <Text style={[badge.label, { color }]}>{label}</Text>
      <Ionicons name={iconName} size={13} color={color} style={{ marginLeft: 6 }} />
    </View>
  );
};

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, margin: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});

// ── Main screen ─────────────────────────────────────────────────────────────
export default function SOSScreen() {
  const [status,       setStatus]       = useState(STATUS.IDLE);
  const [countdown,    setCountdown]    = useState(COUNTDOWN_SECONDS);
  const [locationData, setLocationData] = useState(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [log,          setLog]          = useState([]);
  const [channels,     setChannels]     = useState({ telegram: 'idle', sms: 'idle' });
  const [userInfo,     setUserInfo]     = useState({ name: 'Loading...', phone: '...' });
  const [photoUri,     setPhotoUri]     = useState(null);

  useEffect(() => {
    fetch(`${API_GATEWAY_URL}/sos/config`)
      .then(r => r.json())
      .then(d => setUserInfo(d.user_info))
      .catch(() => setUserInfo({ name: 'Unknown User', phone: 'Unknown Phone' }));
  }, []);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef(null);
  const pulseLoop    = useRef(null);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 1,    duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 0,    duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim, glowAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
  }, [pulseAnim, glowAnim]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const addLog = (msg) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleAddPhoto = async () => {
    const uri = await selectPhotoSource();
    if (uri) {
      setPhotoUri(uri);
      addLog('📷 Photo attached to SOS message');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    addLog('📷 Photo removed from SOS message');
  };

  const cancelSOS = () => {
    clearInterval(countdownRef.current);
    stopPulse();
    Vibration.cancel();
    setStatus(STATUS.IDLE);
    setCountdown(COUNTDOWN_SECONDS);
    setChannels({ telegram: 'idle', sms: 'idle' });
    addLog('SOS cancelled by user.');
  };

  const triggerSOS = () => {
    if (status === STATUS.COUNTDOWN || status === STATUS.SENDING) return;
    setStatus(STATUS.COUNTDOWN);
    setCountdown(COUNTDOWN_SECONDS);
    setLog([]);
    setChannels({ telegram: 'idle', sms: 'idle' });
    startPulse();
    Vibration.vibrate([0, 300, 200, 300]);

    let remaining = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        executeSOS();
      }
    }, 1000);
  };

  const executeSOS = async () => {
    setStatus(STATUS.SENDING);
    stopPulse();
    Vibration.vibrate([0, 500, 300, 500, 300, 500]);
    addLog('Fetching GPS location…');

    let data;
    try {
      data = await getLocationData();
      setLocationData(data);
      addLog(`GPS: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)} ±${Math.round(data.accuracy)}m`);
    } catch (err) {
      setStatus(STATUS.ERROR);
      setErrorMsg(`Location failed: ${err.message}`);
      addLog(`❌ Location error: ${err.message}`);
      triggerShake();
      return;
    }

    // ── Fire Telegram + SMS in parallel ──────────────────────────
    setChannels({ telegram: 'sending', sms: 'sending' });
    addLog('Sending via Telegram + SMS simultaneously…');

    const [telegramResult, smsResult] = await Promise.allSettled([
      (async () => {
        const r = await sendSOSViaTelegram(data, photoUri);
        await sendLocationPin(data);
        return r;
      })(),
      sendSOSViaSMS(
        data,
        null,
        [
          TRAUMA_PHONE,
          HOSPITAL_PHONE,
          POLICE_PHONE,
          FIRE_PHONE
        ],
        'victim',
        photoUri
      ),
    ]);

    // Telegram
    let telegramOk = false;
    if (telegramResult.status === 'fulfilled' && telegramResult.value.success) {
      telegramOk = true;
      setChannels(c => ({ ...c, telegram: 'ok' }));
      addLog('✅ Telegram: sent to all contacts');
    } else {
      const msg = telegramResult.reason?.message
        || telegramResult.value?.errors?.join(', ')
        || 'Unknown error';
      setChannels(c => ({ ...c, telegram: 'error' }));
      addLog(`⚠️  Telegram: ${msg}`);
    }

    // SMS
    let smsOk = false;
    if (smsResult.status === 'fulfilled') {
      const { result } = smsResult.value;
      if (result === 'sent' || result === 'unknown') {
        smsOk = true;
        setChannels(c => ({ ...c, sms: 'ok' }));
        addLog('✅ SMS: dispatched to all numbers');
      } else {
        setChannels(c => ({ ...c, sms: 'error' }));
        addLog('⚠️  SMS: cancelled by user or failed');
      }
    } else {
      setChannels(c => ({ ...c, sms: 'error' }));
      addLog(`⚠️  SMS: ${smsResult.reason?.message}`);
    }

    if (telegramOk || smsOk) {
      setStatus(STATUS.SENT);
      Vibration.vibrate([0, 100, 100, 100, 100, 800]);
    } else {
      setStatus(STATUS.ERROR);
      setErrorMsg('Both Telegram and SMS failed. Check config and retry.');
      triggerShake();
      Vibration.vibrate(1000);
    }
  };

  const reset = () => {
    setStatus(STATUS.IDLE);
    setErrorMsg('');
    setChannels({ telegram: 'idle', sms: 'idle' });
    setPhotoUri(null);
  };

  // ── Derived UI ────────────────────────────────────────────────
  const isCountdown = status === STATUS.COUNTDOWN;
  const isSending   = status === STATUS.SENDING;
  const isSent      = status === STATUS.SENT;
  const isError     = status === STATUS.ERROR;

  const buttonColors = isCountdown ? ['#FF6B00', '#FF3D00']
    : isSent   ? ['#16A34A', '#15803D']
    : isError  ? ['#B91C1C', '#7F1D1D']
    : ['#DC2626', '#991B1B'];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <LinearGradient colors={['#080808', '#1C0000', '#080808']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDot} />
        <Text style={s.headerTitle}>EMERGENCY SOS</Text>
        <View style={[s.headerDot, { opacity: 0 }]} />
      </View>

      {/* User strip */}
      <View style={s.userCard}>
        <Ionicons name="person-circle-outline" size={22} color="#EF4444" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.userName}>{userInfo.name}</Text>
          <Text style={s.userSub}>{userInfo.phone}</Text>
        </View>
        {(isSent || isSending || isError) && (
          <View style={s.channelRow}>
            <ChannelBadge icon="paper-plane-outline" label="TG"  state={channels.telegram} />
            <ChannelBadge icon="chatbox-outline"     label="SMS" state={channels.sms} />
          </View>
        )}
      </View>

      {/* Photo Attachment Section */}
      <View style={s.photoSection}>
        {photoUri ? (
          <View style={s.photoContainer}>
            <Image source={{ uri: photoUri }} style={s.photoThumbnail} />
            <View style={s.photoOverlay}>
              <TouchableOpacity
                style={s.removePhotoBtn}
                onPress={handleRemovePhoto}
                disabled={isSending || isCountdown}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <Text style={s.photoLabel}>📷 Photo attached</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.addPhotoBtn}
            onPress={handleAddPhoto}
            disabled={isSending || isCountdown}
          >
            <Ionicons name="camera" size={24} color="#666" />
            <Text style={s.addPhotoText}>Add photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SOS Button */}
      <View style={s.btnWrapper}>
        <Animated.View style={[s.ring, s.ring3, {
          opacity: Animated.multiply(glowAnim, 0.12),
          transform: [{ scale: pulseAnim }],
        }]} />
        <Animated.View style={[s.ring, s.ring2, {
          opacity: Animated.multiply(glowAnim, 0.22),
          transform: [{ scale: pulseAnim }],
        }]} />
        <Animated.View style={[s.ring, s.ring1, {
          opacity: Animated.multiply(glowAnim, 0.38),
          transform: [{ scale: pulseAnim }],
        }]} />

        <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateX: shakeAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isCountdown ? cancelSOS : isSending ? undefined : triggerSOS}
            disabled={isSending}
          >
            <LinearGradient colors={buttonColors} style={s.sosBtn}>
              {isSending ? (
                <>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={s.sendingLabel}>ALERTING…</Text>
                </>
              ) : isCountdown ? (
                <>
                  <Text style={s.countNum}>{countdown}</Text>
                  <Text style={s.countLabel}>TAP TO CANCEL</Text>
                </>
              ) : isSent ? (
                <>
                  <Ionicons name="checkmark-circle" size={52} color="#FFF" />
                  <Text style={s.sentLabel}>SENT</Text>
                </>
              ) : isError ? (
                <>
                  <Ionicons name="refresh-circle" size={52} color="#FFF" />
                  <Text style={s.errorLabel}>RETRY</Text>
                </>
              ) : (
                <>
                  <Text style={s.sosLabel}>SOS</Text>
                  <Text style={s.sosSub}>PRESS TO ALERT</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Status text */}
      <Text style={s.statusText}>
        {isCountdown ? `Sending in ${countdown}s — tap button to cancel`
          : isSending  ? 'Getting GPS & alerting all channels…'
          : isSent     ? 'Authorities notified via Telegram & SMS'
          : isError    ? errorMsg
          : 'Press the SOS button to send an emergency alert'}
      </Text>

      {/* GPS chip */}
      {locationData && (
        <View style={s.gpsChip}>
          <Ionicons name="location" size={13} color="#EF4444" />
          <Text style={s.gpsText}>
            {locationData.latitude.toFixed(5)}, {locationData.longitude.toFixed(5)}
            {'  '}±{Math.round(locationData.accuracy)}m
          </Text>
        </View>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <ScrollView style={s.logBox} showsVerticalScrollIndicator={false}>
          {log.map((entry, i) => (
            <Text key={i} style={s.logEntry}>{entry}</Text>
          ))}
        </ScrollView>
      )}

      {/* Reset / retry */}
      {(isError || isSent) && (
        <TouchableOpacity style={s.resetBtn} onPress={reset}>
          <Text style={s.resetText}>{isSent ? '↩ Reset' : '↺ Try Again'}</Text>
        </TouchableOpacity>
      )}

      <Text style={s.footer}>
        Sends Telegram message + SMS simultaneously with GPS, time &amp; contact info
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const R = 144;

const s = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingBottom: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  headerTitle: {
    color: '#EF4444', fontSize: 13, fontWeight: '800', letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 34, width: width - 44,
  },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  userSub:  { color: '#666', fontSize: 12, marginTop: 2 },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },

  photoSection: {
    width: width - 44,
    marginBottom: 24,
    alignItems: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  addPhotoText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#1C1C1C',
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  removePhotoBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  photoLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },

  btnWrapper: {
    width: R * 2 + 80, height: R * 2 + 80,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 26,
  },
  ring: { position: 'absolute', borderRadius: 999, backgroundColor: '#EF4444' },
  ring1: { width: R * 2 + 36, height: R * 2 + 36 },
  ring2: { width: R * 2 + 60, height: R * 2 + 60 },
  ring3: { width: R * 2 + 80, height: R * 2 + 80 },

  sosBtn: {
    width: R * 2, height: R * 2, borderRadius: R,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#EF4444', shadowRadius: 32, shadowOpacity: 0.75,
    elevation: 24,
  },
  sosLabel:    { color: '#FFF', fontSize: 54, fontWeight: '900', letterSpacing: 6 },
  sosSub:      { color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 3, marginTop: 4 },
  countNum:    { color: '#FFF', fontSize: 74, fontWeight: '900' },
  countLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: 10, letterSpacing: 2 },
  sendingLabel:{ color: '#FFF', fontSize: 13, letterSpacing: 3, marginTop: 10, fontWeight: '700' },
  sentLabel:   { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 8, letterSpacing: 4 },
  errorLabel:  { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 8, letterSpacing: 4 },

  statusText: {
    color: '#888', fontSize: 13, textAlign: 'center',
    paddingHorizontal: 32, lineHeight: 20, marginBottom: 14,
  },

  gpsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
  },
  gpsText: {
    color: '#FC8181', fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  logBox: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: '#1E1E1E', borderWidth: 1, borderRadius: 10,
    width: width - 44, maxHeight: 108,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
  },
  logEntry: {
    color: '#555', fontSize: 11, marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  resetBtn: {
    borderColor: '#EF4444', borderWidth: 1, borderRadius: 24,
    paddingHorizontal: 28, paddingVertical: 9, marginBottom: 12,
  },
  resetText: { color: '#EF4444', fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  footer: {
    color: '#333', fontSize: 11, textAlign: 'center',
    paddingHorizontal: 32, position: 'absolute', bottom: 20,
  },
});
