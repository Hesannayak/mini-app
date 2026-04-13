import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MiniLogo from '@/components/MiniLogo';
import PinInput from '@/components/PinInput';
import { useUserStore } from '@/store/userStore';
import { checkPaymentAuth } from '@/utils/paymentRules';
import { API } from '@/lib/api';

const MOCK_RESPONSES: Record<string, string> = {
  balance: 'Aapke account mein ₹42,350 hain. Savings account mein ₹18,600 aur current mein ₹23,750.',
  spend: 'Aaj ₹1,240 ka kharch hua. Sabse zyada khane pe — ₹480. Budget ke andar ho aap.',
  bill: 'Tata Power ka bill ₹1,420 hai, 2 din mein due hai. Abhi pay karein?',
  budget: 'Khane ka budget ₹3,000 set kar diya. Aaj tak ₹1,850 kharch hua — ₹1,150 baaki hai.',
};

function getMockResponse(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('bacha') || t.includes('balance') || t.includes('kitna')) return MOCK_RESPONSES.balance;
  if (t.includes('kharch') || t.includes('spend') || t.includes('gaya')) return MOCK_RESPONSES.spend;
  if (t.includes('bill') || t.includes('bijli')) return MOCK_RESPONSES.bill;
  if (t.includes('budget')) return MOCK_RESPONSES.budget;
  return 'Main samajh gaya. Aapki financial health acchi hai — Mini Score 72 hai. Koi specific cheez jaanna chahte hain?';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const CHIPS = [
  { icon: 'trending-down' as const, text: 'Aaj kitna gaya?' },
  { icon: 'credit-card' as const, text: 'Balance check karo' },
  { icon: 'zap' as const, text: 'Bill kitna hai?' },
  { icon: 'target' as const, text: 'Score kaise badhayein?' },
];

export default function HomeScreen() {
  const { name } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payee, setPayee] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handlePayment = (amount: number, contact: string) => {
    setPayAmount(amount);
    setPayee(contact);
    const auth = checkPaymentAuth(amount, contact);
    if (auth.requiresPin) {
      setShowPin(true);
    } else {
      instantPay(amount, contact);
    }
  };

  const instantPay = (amount: number, contact: string) => {
    addMessage('assistant', `Bhej diya — ₹${amount.toLocaleString('en-IN')} ${contact} ko.`);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { id: `${role}${Date.now()}`, role, content }]);
    scrollToBottom();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const msg = text.trim();
    addMessage('user', msg);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    if (Platform.OS !== 'web') Haptics.selectionAsync();

    // Step 1: voice service for intent detection (payment commands)
    try {
      const voiceRes = await fetch(`${API.voice()}/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg, language: 'hi' }),
      });
      if (voiceRes.ok) {
        const voiceData = await voiceRes.json();
        if (voiceData.intent === 'send_money' && voiceData.entities?.amount) {
          setIsLoading(false);
          handlePayment(voiceData.entities.amount, voiceData.entities.contact_name || 'Unknown');
          return;
        }
      }
    } catch {}

    // Step 2: coach service for real Claude AI response
    try {
      const coachRes = await fetch(`${API.coach()}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, language: 'hi', user_id: 'demo' }),
      });
      if (coachRes.ok) {
        const coachData = await coachRes.json();
        if (coachData.success && coachData.data?.response) {
          addMessage('assistant', coachData.data.response);
          setIsLoading(false);
          return;
        }
      }
    } catch {}

    // Step 3: local fallback only if both services unreachable
    addMessage('assistant', getMockResponse(msg));
    setIsLoading(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="light-content" />

      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View style={s.hLeft}>
          <View style={s.logoSmall}>
            <MiniLogo size={28} />
          </View>
          <View>
            <Text style={s.hTitle}>Mini</Text>
            <Text style={s.hSub}>AI Finance Coach</Text>
          </View>
        </View>
        <TouchableOpacity style={s.hBtn}>
          <Feather name="bell" size={18} color="#8B8BAD" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.chat}
        contentContainerStyle={isEmpty ? s.chatEmpty : s.chatFull}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={s.greeting}>
            <View style={s.greetLogoWrap}>
              <MiniLogo size={52} />
            </View>
            <Text style={s.greetTitle}>{getGreeting()}{name ? `, ${name}` : ''}</Text>
            <Text style={s.greetSub}>Aaj main kaise help kar sakta hoon?</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={msg.role === 'user' ? s.userRow : s.aiRow}>
              {msg.role === 'assistant' && (
                <View style={s.aiBadge}><MiniLogo size={20} /></View>
              )}
              <View style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
                <Text style={msg.role === 'user' ? s.userText : s.aiText}>{msg.content}</Text>
              </View>
            </View>
          ))
        )}
        {isLoading && (
          <View style={s.aiRow}>
            <View style={s.aiBadge}><MiniLogo size={20} spinning /></View>
            <View style={s.typingBubble}>
              <View style={s.dot} /><View style={[s.dot, s.dotMid]} /><View style={s.dot} />
            </View>
          </View>
        )}
      </ScrollView>

      {isEmpty && (
        <View style={s.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {CHIPS.map((chip, i) => (
              <TouchableOpacity key={i} style={s.chip} onPress={() => sendMessage(chip.text)} activeOpacity={0.75}>
                <Feather name={chip.icon} size={14} color="#6366F1" style={s.chipIcon} />
                <Text style={s.chipText}>{chip.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[s.inputWrap, { paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16) }]}>
        <View style={s.inputCard}>
          <TextInput
            style={s.input}
            placeholder="Chat with Mini..."
            placeholderTextColor="#3A3A5A"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <View style={s.inputRow}>
            <TouchableOpacity style={s.attachBtn}>
              <Feather name="plus" size={18} color="#6366F1" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={s.micBtn}>
              <Feather name="mic" size={16} color="#8B8BAD" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sendBtn, inputText.trim() ? s.sendBtnActive : null]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
            >
              <Feather name="arrow-up" size={18} color={inputText.trim() ? '#080812' : '#3A3A5A'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PinInput
        visible={showPin}
        amount={payAmount}
        payee={payee}
        onConfirm={() => { setShowPin(false); instantPay(payAmount, payee); }}
        onCancel={() => setShowPin(false)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#0F0F1E',
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#14142A', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },
  hTitle: { color: '#EEF2FF', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  hSub: { color: '#8B8BAD', fontSize: 12, marginTop: 1, fontFamily: 'Inter_400Regular' },
  hBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },

  chat: { flex: 1 },
  chatEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  chatFull: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },

  greeting: { alignItems: 'center', gap: 12 },
  greetLogoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#14142A', borderWidth: 1.5, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  greetTitle: { color: '#EEF2FF', fontSize: 26, fontWeight: '700', textAlign: 'center', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  greetSub: { color: '#8B8BAD', fontSize: 16, textAlign: 'center', fontFamily: 'Inter_400Regular' },

  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 10 },
  aiBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#14142A', borderWidth: 1, borderColor: '#1E2040',
    justifyContent: 'center', alignItems: 'center',
  },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: { backgroundColor: '#1A1A3A', borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1E2040', borderBottomLeftRadius: 6 },
  userText: { color: '#EEF2FF', fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  aiText: { color: '#C8D0F0', fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular' },

  typingBubble: {
    backgroundColor: '#0F0F1E', borderWidth: 1, borderColor: '#1E2040',
    borderRadius: 20, borderBottomLeftRadius: 6,
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6366F1', opacity: 0.5 },
  dotMid: { opacity: 1 },

  chipsWrap: { paddingBottom: 8 },
  chipsRow: { paddingLeft: 16, paddingRight: 8, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0F0F1E', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#1E2040',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  chipIcon: {},
  chipText: { color: '#C8D0F0', fontSize: 14, fontFamily: 'Inter_500Medium', fontWeight: '500' },

  inputWrap: { paddingHorizontal: 12, paddingTop: 4 },
  inputCard: {
    backgroundColor: '#0F0F1E', borderRadius: 20,
    borderWidth: 1, borderColor: '#1E2040',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
  },
  input: {
    color: '#EEF2FF', fontSize: 16, fontFamily: 'Inter_400Regular',
    paddingVertical: 0, marginBottom: 10, minHeight: 22, maxHeight: 80,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#13133A', justifyContent: 'center', alignItems: 'center',
  },
  micBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#14142A', justifyContent: 'center', alignItems: 'center',
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1E2040', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#EEF2FF',
    shadowColor: '#EEF2FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
});
