import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tasks:v1';
const HERO_TITLE = 'もやもや';

function generateId() {
  return Date.now();
}

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all | pending | completed

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setTasks(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch {}
    })();
  }, [tasks]);

  const addTask = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const task = { id: generateId(), text: trimmed, completed: false, createdAt: new Date().toISOString() };
    setTasks((prev) => [task, ...prev]);
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const editTask = useCallback((id, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)));
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'completed':
        return tasks.filter((t) => t.completed);
      case 'pending':
        return tasks.filter((t) => !t.completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const statsText = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    if (filter === 'completed') return `完了済み: ${completed}件`;
    if (filter === 'pending') return `未完了: ${pending}件`;
    return `全${total}件 (完了: ${completed}件, 未完了: ${pending}件)`;
  }, [tasks, filter]);

  return { tasks, filtered, filter, setFilter, addTask, toggleTask, deleteTask, editTask, statsText };
}

export default function App() {
  const { filtered, filter, setFilter, addTask, toggleTask, deleteTask, editTask, statsText } = useTasks();
  const [taskInputText, setTaskInputText] = useState('');
  const inputRef = useRef(null);

  const onAddTask = useCallback(() => {
    addTask(taskInputText);
    setTaskInputText('');
    inputRef.current?.focus();
  }, [addTask, taskInputText]);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#6b7cff", "#8a5bd1"]}
        start={{ x: 0.1, y: -0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{HERO_TITLE}</Text>
          <Text style={styles.heroSubtitle}>毎日のタスクをスマートに整理。シンプルでパワフル。</Text>
          <View style={styles.heroActions}>
            <Pressable onPress={() => inputRef.current?.focus()} style={({ pressed }) => [styles.primaryBtnLarge, pressed && styles.pressed]}>
              <Text style={styles.primaryBtnText}>今すぐ始める</Text>
            </Pressable>
            <Pressable onPress={() => inputRef.current?.focus()} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryBtnText}>使い方</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={taskInputText}
          onChangeText={setTaskInputText}
          placeholder="新しいタスクを入力..."
          maxLength={100}
          onSubmitEditing={onAddTask}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable onPress={onAddTask} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <Text style={styles.primaryBtnText}>追加</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'すべて' },
          { key: 'pending', label: '未完了' },
          { key: 'completed', label: '完了済み' },
        ].map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.stats}>{statsText}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={() => toggleTask(item.id)}
            onDelete={() => deleteTask(item.id)}
            onEdit={(txt) => editTask(item.id, txt)}
          />
        )}
      />

      <StatusBar style="light" />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return setEditing(false);
    onEdit(trimmed);
    setEditing(false);
  }, [onEdit, value]);

  return (
    <View style={[styles.item, task.completed && styles.itemCompleted]}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.checkbox, task.completed && styles.checkboxOn, pressed && styles.pressed]}>
        <Text style={styles.checkboxMark}>{task.completed ? '✓' : ''}</Text>
      </Pressable>

      {editing ? (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={save}
          onBlur={save}
          style={styles.editInput}
        />
      ) : (
        <Pressable onLongPress={() => setEditing(true)} style={styles.textWrap}>
          <Text style={[styles.text, task.completed && styles.textCompleted]}>{task.text}</Text>
        </Pressable>
      )}

      <Pressable onPress={onDelete} style={({ pressed }) => [styles.smallBtn, styles.deleteBtn, pressed && styles.pressed]}>
        <Text style={styles.smallBtnText}>削除</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2140',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  hero: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 200,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    marginTop: 6,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'center',
  },
  primaryBtnLarge: {
    backgroundColor: '#2a2d5e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2d5e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    backgroundColor: '#6b7cff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2d5e',
  },
  filterBtnActive: {
    backgroundColor: '#6b7cff',
  },
  filterText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  stats: {
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 'auto',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#262957',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemCompleted: {
    backgroundColor: '#1f3a2a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2d5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#4caf50',
  },
  checkboxMark: {
    color: '#fff',
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.7)',
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#444876',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
