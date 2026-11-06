// SectionCompleteScreen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopHeaderDark from "../components/TopHeaderDark";
import styles from "../styles/SectionCompleteScreen.styles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const ACHIEVEMENTS = [
  { emoji: '🎯', title: 'Objective Complete', description: 'All questions answered' },
  { emoji: '⚡', title: 'Quick Thinker', description: 'Answered efficiently' },
  { emoji: '🌟', title: 'Star Explorer', description: 'One step closer to the finish' },
];

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Floating star particle */
const FloatingStar = ({ delay, duration, startX, size, opacity }) => {
  const animY = useRef(new Animated.Value(-50)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(animY, {
            toValue: SCREEN_HEIGHT + 100,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(animOpacity, {
              toValue: opacity,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(animOpacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: -50,
        transform: [{ translateY: animY }],
        opacity: animOpacity,
      }}
    >
      <Text style={{ fontSize: size }}>⭐</Text>
    </Animated.View>
  );
};

/** Star field with floating particles */
const StarField = () => {
  const stars = [
    { delay: 0, duration: 4000, startX: '10%', size: 14, opacity: 0.6 },
    { delay: 1000, duration: 5000, startX: '30%', size: 10, opacity: 0.4 },
    { delay: 2000, duration: 4500, startX: '55%', size: 16, opacity: 0.5 },
    { delay: 500, duration: 5500, startX: '75%', size: 12, opacity: 0.3 },
    { delay: 1500, duration: 4800, startX: '90%', size: 8, opacity: 0.5 },
    { delay: 2500, duration: 4200, startX: '20%', size: 14, opacity: 0.4 },
    { delay: 3000, duration: 5000, startX: '65%', size: 10, opacity: 0.3 },
    { delay: 3500, duration: 4600, startX: '45%', size: 12, opacity: 0.5 },
  ];

  return (
    <View style={styles.starsContainer} pointerEvents="none">
      {stars.map((star, i) => (
        <FloatingStar key={i} {...star} />
      ))}
    </View>
  );
};

/** Achievement badge */
const AchievementBadge = ({ emoji, title, description, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.achievementBadge,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={styles.achievementEmojiWrap}>
        <Text style={styles.achievementEmoji}>{emoji}</Text>
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementTitle}>{title}</Text>
        <Text style={styles.achievementDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

/** Animated progress ring */
const ProgressRing = ({ progress }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(spinAnim, {
        toValue: progress,
        duration: 1600,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.ringContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.ringGlow} />
      <View style={styles.ringBg} />
      <Animated.View
        style={[
          styles.ringArc,
          { transform: [{ rotate: spin }] },
        ]}
      />
      <View style={styles.ringCenter}>
        <Text style={styles.ringEmoji}>🏆</Text>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const SectionCompleteScreen = ({ navigation, route }) => {
  const {
    phase,
    section,
    sectionIndex,
    totalSections,
    questionsAnswered,
    alumniId,
    programType,
  } = route.params;

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(24)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;

  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    Animated.sequence([
      // Title slides in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Stats pop in
      Animated.parallel([
        Animated.spring(statsScale, {
          toValue: 1,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Confetti burst
      Animated.timing(confettiOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Buttons slide up
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(confettiOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowConfetti(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleNextSection = () => {
    navigation.navigate("PhaseSections", {
      phase: phase,
      alumniId: alumniId,
      programType: programType,
    });
  };

  const handleBackToMissions = () => {
    navigation.navigate("TracerMenu");
  };

  const handleShareProgress = () => {
    const sectionTitle = section?.title || "a tracer section";
    const progressCaption = `🚀 Milestone Unlocked! I just completed "${sectionTitle}"! 🎯

Progress: ${sectionIndex + 1}/${totalSections} (${completionPct}%) — one step closer!

Your turn, Bulldogs! What's your update? 👇`;

    navigation.navigate("CreatePostScreen", {
      initialCaption: progressCaption,
      tracerProgress: {
        sectionName: sectionTitle,
        completed: sectionIndex + 1,
        total: totalSections,
        percent: completionPct,
      },
    });
  };

  const isLastSection = sectionIndex + 1 >= totalSections;
  const completionPct = totalSections > 0
    ? Math.round(((sectionIndex + 1) / totalSections) * 100)
    : 100;
  const remaining = totalSections - sectionIndex - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <TopHeaderDark />

      <View style={styles.container}>
        {/* Confetti overlay */}
        {showConfetti && (
          <Animated.View
            style={[styles.confettiContainer, { opacity: confettiOpacity }]}
            pointerEvents="none"
          >
            <StarField />
          </Animated.View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero section */}
          <View style={styles.heroSection}>
            <ProgressRing progress={1} />
          </View>

          {/* Title block */}
          <Animated.View
            style={[
              styles.titleBlock,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <Text style={styles.congratsLabel}>MISSION ACCOMPLISHED</Text>
            <Text style={styles.congratsTitle}>Section Complete!</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.congratsSubtitle}>
              Excellent work, Commander! You've successfully completed{"\n"}
              <Text style={{ color: '#FFD404', fontFamily: 'Poppins_600SemiBold' }}>
                "{section.title}"
              </Text>
            </Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                transform: [{ scale: statsScale }],
                opacity: statsOpacity,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{questionsAnswered}</Text>
              <Text style={styles.statLabel}>Questions{"\n"}Answered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {sectionIndex + 1}/{totalSections}
              </Text>
              <Text style={styles.statLabel}>Objectives{"\n"}Complete</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completionPct}%</Text>
              <Text style={styles.statLabel}>Mission{"\n"}Progress</Text>
            </View>
          </Animated.View>

          {/* Achievements header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Achievements Unlocked</Text>
            <View style={styles.sectionHeaderLine} />
          </View>

          {/* Achievements */}
          <View style={styles.achievementsContainer}>
            {ACHIEVEMENTS.map((achievement, index) => (
              <AchievementBadge
                key={index}
                emoji={achievement.emoji}
                title={achievement.title}
                description={achievement.description}
                delay={1000 + index * 300}
              />
            ))}
          </View>

          {/* XP / Progress message */}
          <View style={styles.xpCard}>
            <View style={styles.xpIconWrap}>
              <Text style={styles.xpIcon}>🚀</Text>
            </View>
            <Text style={styles.xpText}>
              {isLastSection
                ? "Incredible! You've completed all objectives in this mission!"
                : `${remaining} more objective${remaining > 1 ? 's' : ''} remaining. Keep going, Commander!`}
            </Text>
          </View>

          {/* Action buttons */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY: buttonTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.shareProgressButton}
              onPress={handleShareProgress}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFD404" />
              <Text style={styles.secondaryButtonText}>Share Progress</Text>
            </TouchableOpacity>

            {!isLastSection && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNextSection}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Next Objective</Text>
                <Ionicons name="arrow-forward" size={20} color="#1A237E" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={isLastSection ? styles.primaryButton : styles.secondaryButton}
              onPress={handleBackToMissions}
              activeOpacity={0.85}
            >
              <Ionicons
                name="rocket-outline"
                size={20}
                color={isLastSection ? "#1A237E" : "#FFD404"}
              />
              <Text
                style={
                  isLastSection
                    ? styles.primaryButtonText
                    : styles.secondaryButtonText
                }
              >
                {isLastSection ? 'Mission Complete!' : 'Back to Missions'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SectionCompleteScreen;