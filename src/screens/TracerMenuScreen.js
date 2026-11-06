// TracerMenuScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopHeaderDark from "../components/TopHeaderDark";
import styles, { COLORS } from "../styles/TracerMenuScreen.styles";
import { 
  getTracerForms, 
  getTracerProgress,
  getCompletedAlumniCount,
  getEligibleTracers,
} from "../services/tracerQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import mascotImg from '../../assets/images/nu-mascot.png';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TOTAL_STARS = 5;

// Generate constellation-like stars
const generateStars = () => {
  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.15,
    });
  }
  return stars;
};

const STARS = generateStars();

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

const getPhaseIcon = (iconName) => {
  const iconMap = {
    "fa-user": "🧑‍🚀",
    "fa-graduation-cap": "🎓",
    "fa-briefcase": "💼",
    "fa-chart-line": "📊",
    "fa-home": "🏠",
    "fa-map-marker-alt": "📍",
    "fa-phone": "📡",
    "fa-envelope": "📨",
  };
  return iconMap[iconName] || "🛸";
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Constellation background */
const StarField = () => (
  <View style={styles.starsContainer} pointerEvents="none">
    {STARS.map((star, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          top: star.top,
          left: star.left,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: '#FFFFFF',
          opacity: star.opacity,
        }}
      />
    ))}
  </View>
);

/** Star-based progress indicator */
const StarProgress = ({ completedCount, totalSections }) => {
  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const filledStars = totalSections > 0 ? Math.round((completedCount / totalSections) * TOTAL_STARS) : 0;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.progressLabel}>Overall Progress</Text>
      
      {/* Stars + Percentage */}
      <View style={styles.progressHeaderRow}>
        <View style={styles.progressStarContainer}>
          {[...Array(TOTAL_STARS)].map((_, i) => (
            <Text
              key={i}
              style={[
                styles.progressStar,
                i >= filledStars && styles.progressStarEmpty,
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
        <View style={styles.progressPercentContainer}>
          <Text style={styles.progressPercentText}>{pct}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${Math.max(pct, 2)}%` }]}
          />
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.milestonesRow}>
        {[0, 25, 50, 75, 100].map((milestone) => {
          const reached = pct >= milestone;
          return (
            <View key={milestone} style={styles.milestoneItem}>
              <View
                style={[
                  styles.milestoneDot,
                  reached && styles.milestoneDotReached,
                ]}
              />
              <Text
                style={[
                  styles.milestoneLabel,
                  reached && styles.milestoneLabelReached,
                ]}
              >
                {milestone}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/** Phase/Mission Card */
const PhaseCard = ({ phase, phaseIndex, completedCount, totalSections, onPress }) => {
  const isDone = completedCount === totalSections && totalSections > 0;
  const progressRatio = totalSections > 0 ? completedCount / totalSections : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const accentColor = phase.color || COLORS.nebulaBlue;

  // Show target badge if phase is specific to college or shs
  const targetBadge = phase.target_alumni_type && phase.target_alumni_type !== 'all' ? (
    <View style={styles.targetBadge}>
      <Text style={styles.targetBadgeText}>
        {phase.target_alumni_type === 'college' ? '🎓 College Exclusive' : '🏫 SHS Exclusive'}
      </Text>
    </View>
  ) : null;

  return (
    <TouchableOpacity
      style={[styles.phaseCard, isDone && styles.phaseCardDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accentLine, { backgroundColor: isDone ? COLORS.nebulaGreen : accentColor }]} />
      
      <View style={styles.phaseCardContent}>
        {/* Header */}
        <View style={styles.phaseHeader}>
          <View style={[styles.phaseIconContainer, { backgroundColor: accentColor + '18' }]}>
            <Text style={styles.phaseIcon}>{getPhaseIcon(phase.icon)}</Text>
          </View>
          
          <View style={styles.phaseHeaderInfo}>
            <View style={styles.phaseHeaderTop}>
              <View style={[styles.phaseBadge, { backgroundColor: accentColor + '15' }]}>
                <View style={[styles.phaseBadgeDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.phaseBadgeText, { color: accentColor }]}>
                  Mission {phaseIndex + 1}
                </Text>
              </View>
              {targetBadge}
              {isDone && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✦ Complete</Text>
                </View>
              )}
            </View>
            <Text style={styles.phaseTitle} numberOfLines={2}>{phase.title}</Text>
            {phase.subtitle ? (
              <Text style={styles.phaseSubtitle} numberOfLines={2}>{phase.subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <View style={styles.progressStats}>
              <Text style={styles.progressPin}>{isDone ? '✅' : '📍'}</Text>
              <Text style={[styles.progressCount, { color: isDone ? COLORS.nebulaGreen : accentColor }]}>
                {completedCount}
              </Text>
              <Text style={styles.progressTotal}> / {totalSections} sections</Text>
            </View>
            <Text style={[styles.progressPercent, { color: isDone ? COLORS.nebulaGreen : accentColor }]}>
              {progressPercent}%
            </Text>
          </View>
          
          <View style={styles.progressBarCardBg}>
            <View
              style={[
                styles.progressBarCardFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isDone ? COLORS.nebulaGreen : accentColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Action */}
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>
            {isDone ? 'View mission report' : totalSections > 0 ? 'Continue mission' : 'Begin mission'}
          </Text>
          <Text style={[styles.actionArrow, { color: accentColor }]}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Tracer Card — one card per eligible tracer (SHS / College) */
const TracerCard = ({ tracer, onPress }) => {
  const { programType, label, icon, programName, phases, progress } = tracer;

  // Compute totals for THIS tracer
  const totalSections = (phases || []).reduce(
    (sum, phase) => sum + (phase.sections?.length || 0),
    0
  );

  const completedSectionIds = new Set(progress?.completedSectionIds || []);
  const completedCount = (phases || []).reduce((sum, phase) => {
    return sum + (phase.sections || []).filter(s => completedSectionIds.has(s.id)).length;
  }, 0);

  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const isDone = pct === 100 && totalSections > 0;

  // Visual identity per tracer type
  const identity = programType === 'college'
    ? { emoji: '🎓', color: '#3B82F6', subtitle: programName || 'College Program' }
    : { emoji: '🏫', color: '#F59E0B', subtitle: 'Senior High School' };

  return (
    <TouchableOpacity
      style={[styles.phaseCard, isDone && styles.phaseCardDone, { marginBottom: 16 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.accentLine,
          { backgroundColor: isDone ? COLORS.nebulaGreen : identity.color },
        ]}
      />

      <View style={styles.phaseCardContent}>
        {/* Header */}
        <View style={styles.phaseHeader}>
          <View
            style={[
              styles.phaseIconContainer,
              { backgroundColor: identity.color + '18' },
            ]}
          >
            <Text style={styles.phaseIcon}>{identity.emoji}</Text>
          </View>

          <View style={styles.phaseHeaderInfo}>
            <View style={styles.phaseHeaderTop}>
              <View
                style={[
                  styles.phaseBadge,
                  { backgroundColor: identity.color + '15' },
                ]}
              >
                <View
                  style={[
                    styles.phaseBadgeDot,
                    { backgroundColor: identity.color },
                  ]}
                />
                <Text style={[styles.phaseBadgeText, { color: identity.color }]}>
                  {programType.toUpperCase()} Tracer
                </Text>
              </View>
              {isDone && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✦ Complete</Text>
                </View>
              )}
            </View>
            <Text style={styles.phaseTitle} numberOfLines={2}>
              {label}
            </Text>
            <Text style={styles.phaseSubtitle} numberOfLines={2}>
              {identity.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <View style={styles.progressStats}>
              <Text style={styles.progressPin}>{isDone ? '✅' : '📍'}</Text>
              <Text
                style={[
                  styles.progressCount,
                  { color: isDone ? COLORS.nebulaGreen : identity.color },
                ]}
              >
                {completedCount}
              </Text>
              <Text style={styles.progressTotal}> / {totalSections} sections</Text>
            </View>
            <Text
              style={[
                styles.progressPercent,
                { color: isDone ? COLORS.nebulaGreen : identity.color },
              ]}
            >
              {pct}%
            </Text>
          </View>

          <View style={styles.progressBarCardBg}>
            <View
              style={[
                styles.progressBarCardFill,
                {
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: isDone ? COLORS.nebulaGreen : identity.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Action */}
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>
            {isDone
              ? 'View tracer report'
              : completedCount > 0
              ? 'Continue tracer'
              : 'Begin tracer'}
          </Text>
          <Text style={[styles.actionArrow, { color: identity.color }]}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const TracerMenuScreen = ({ navigation }) => {
  // 🆕 One entry per eligible tracer (SHS, College, or both)
  const [tracers, setTracers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alumniData, setAlumniData] = useState(null);
  const [completedAlumniCount, setCompletedAlumniCount] = useState(0);

  const loadTracerData = async () => {
    try {
      setLoading(true);

      // 1. Auth check
      const supaUser = await getCurrentUser();
      if (!supaUser?.email) {
        ThemedAlert.alert("Session Expired", "Please log in again to access the tracer.");
        navigation.replace("Login");
        return;
      }

      // 2. Fetch the alumni record
      const alumni = await getAlumniByEmail(supaUser.email);
      if (!alumni) {
        ThemedAlert.alert("Profile Not Found", "Unable to find your alumni profile.");
        return;
      }
      console.log("🐛 [TracerMenu] Logged-in alumni:", {
        id: alumni.id,
        email: alumni.email,
        alumni_type: alumni.alumni_type,
      });
      setAlumniData(alumni);

      // 3. Determine which tracers this alumnus can open
      //    (SHS always, College only if they graduated it)
      const eligibleTracers = await getEligibleTracers(alumni.id);
      console.log("[TracerMenuScreen] Eligible tracers:", eligibleTracers);

      // 4. Fetch phases + progress for each tracer, in parallel
      const [tracerData, completedCount] = await Promise.all([
        Promise.all(
          eligibleTracers.map(async (tracer) => {
            const [phases, progress] = await Promise.all([
              getTracerForms(tracer.programType),
              getTracerProgress(alumni.id, tracer.programType),
            ]);
            return { ...tracer, phases, progress };
          })
        ),
        getCompletedAlumniCount(),
      ]);

      // 5. Store
      setTracers(tracerData);
      setCompletedAlumniCount(completedCount || 0);

      console.log(
        "[TracerMenuScreen] Loaded tracers:",
        tracerData.map(t => ({
          type: t.programType,
          sections: t.phases?.reduce((s, p) => s + (p.sections?.length || 0), 0),
        }))
      );

    } catch (error) {
      console.error("[TracerMenuScreen] Error loading data:", error);
      ThemedAlert.alert("Error", "Failed to load tracer information. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTracerData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTracerData();
  };

  const handlePhasePress = (phase, programType) => {
    if (!alumniData?.id) {
      console.warn("[TracerMenu] Cannot navigate — alumniData.id is missing:", alumniData);
      ThemedAlert.alert(
        "Session Error",
        "Your alumni profile is still loading. Please try again in a moment."
      );
      return;
    }
    navigation.navigate("PhaseSections", {
      phase: phase,
      alumniId: alumniData.id,
      programType: programType,   // 🔥 NEW — which tracer this phase belongs to
    });
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />
        <TopHeaderDark />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.goldStar} />
          <Text style={styles.loadingText}>Initializing navigation systems...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />
      <TopHeaderDark />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.goldStar}
            colors={[COLORS.goldStar]}
            progressBackgroundColor={COLORS.cardBg}
          />
        }
      >
        <StarField />

        {/* ── HERO ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Alumni Explorer</Text>
          <Text style={styles.heroSubtitle}>Digital Alumni Tracer</Text>
        </View>

               {/* ── TRACERS ── */}
        {tracers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌌</Text>
            <Text style={styles.emptyTitle}>No Active Tracers</Text>
            <Text style={styles.emptyText}>
              The cosmos is quiet. No tracer missions are available at this moment.
            </Text>
          </View>
        ) : (
          tracers.map((tracer) => (
            <View
              key={tracer.programType}
              style={styles.phasesSection}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionIcon}>
                    {tracer.programType === 'college' ? '🎓' : '🏫'}
                  </Text>
                  <Text style={styles.sectionTitle}>{tracer.label}</Text>
                </View>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {tracer.phases?.length || 0} missions
                  </Text>
                </View>
              </View>

              {/* Tracer overall progress header */}
              <TracerCard
                tracer={tracer}
                onPress={() => {
                  // Navigate to the first phase of this tracer
                  const firstPhase = (tracer.phases || [])[0];
                  if (firstPhase) {
                    handlePhasePress(firstPhase, tracer.programType);
                  } else {
                    ThemedAlert.alert(
                      "Empty Tracer",
                      "This tracer has no phases yet."
                    );
                  }
                }}
              />

              {/* Phase cards INSIDE this tracer */}
              {(tracer.phases || []).map((phase, index) => {
                const sections = phase.sections || [];
                const completedSet = new Set(tracer.progress?.completedSectionIds || []);
                const completedCount = sections.filter(s =>
                  completedSet.has(s.id)
                ).length;

                return (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    phaseIndex={index}
                    completedCount={completedCount}
                    totalSections={sections.length}
                    onPress={() => handlePhasePress(phase, tracer.programType)}
                  />
                );
              })}
            </View>
          ))
        )}

        {/* ── SHARE YOUR JOURNEY ── */}
        <View style={styles.journeySection}>
          {(() => {
            // Determine message based on count
            if (loading) {
              return (
                <>
                  <Text style={styles.journeyTitle}>Loading alumni data...</Text>
                  <Text style={styles.journeyHighlight}>Please wait</Text>
                  <Text style={styles.journeyText}>We're preparing your journey stats.</Text>
                  <View style={styles.mascotContainer}>
                    <Image source={mascotImg} style={styles.mascotImage} />
                  </View>
                  <View style={styles.alumniCountContainer}>
                    <Text style={[styles.alumniCountText, styles.motivationalText]}>
                      ⏳ Loading...
                    </Text>
                  </View>
                </>
              );
            }

            if (completedAlumniCount === 0) {
              return (
                <>
                  <Text style={styles.journeyTitle}>Be the First Explorer! 🚀</Text>
                  <Text style={styles.journeyHighlight}>Pioneer the Tracer</Text>
                  <Text style={styles.journeyText}>
                    You have the chance to be the very first alumni to complete the tracer survey! Your response will light the way for future Nationalians.
                  </Text>
                  <View style={styles.mascotContainer}>
                    <Image source={mascotImg} style={styles.mascotImage} />
                  </View>
                  <View style={styles.alumniCountContainer}>
                    <Text style={[styles.alumniCountText, styles.motivationalText]}>
                      🌟 Be the pioneer! Complete your tracer now!
                    </Text>
                  </View>
                </>
              );
            }

            if (completedAlumniCount < 5) {
              return (
                <>
                  <Text style={styles.journeyTitle}>Join the First Explorers! 🌟</Text>
                  <Text style={styles.journeyHighlight}>Early Adopters</Text>
                  <Text style={styles.journeyText}>
                    {completedAlumniCount} alumni have already completed the tracer. Be among the first wave of explorers to shape the future of NU Lipa!
                  </Text>
                  <View style={styles.mascotContainer}>
                    <Image source={mascotImg} style={styles.mascotImage} />
                  </View>
                  <View style={styles.alumniCountContainer}>
                    <Text style={[styles.alumniCountText, styles.motivationalText]}>
                      🚀 {completedAlumniCount} pioneers and counting! Join the ranks!
                    </Text>
                  </View>
                </>
              );
            }

            if (completedAlumniCount < 10) {
              return (
                <>
                  <Text style={styles.journeyTitle}>The Community is Growing! 🌱</Text>
                  <Text style={styles.journeyHighlight}>Building Momentum</Text>
                  <Text style={styles.journeyText}>
                    {completedAlumniCount} alumni have now completed their tracer! Your voice matters - help us reach the next milestone!
                  </Text>
                  <View style={styles.mascotContainer}>
                    <Image source={mascotImg} style={styles.mascotImage} />
                  </View>
                  <View style={styles.alumniCountContainer}>
                    <Text style={[styles.alumniCountText, styles.motivationalText]}>
                      ✨ {completedAlumniCount} explorers strong! Ready to make it {completedAlumniCount + 1}?
                    </Text>
                  </View>
                </>
              );
            }

            if (completedAlumniCount < 15) {
              return (
                <>
                  <Text style={styles.journeyTitle}>Almost There! 💪</Text>
                  <Text style={styles.journeyHighlight}>Nearing the Milestone</Text>
                  <Text style={styles.journeyText}>
                    We're getting close to 15 completions! {completedAlumniCount} alumni have already shared their journey. Will you be the one to push us over the edge?
                  </Text>
                  <View style={styles.mascotContainer}>
                    <Image source={mascotImg} style={styles.mascotImage} />
                  </View>
                  <View style={styles.alumniCountContainer}>
                    <Text style={[styles.alumniCountText, styles.motivationalText]}>
                      🎯 {completedAlumniCount}/15 - Just {15 - completedAlumniCount} more to go!
                    </Text>
                  </View>
                </>
              );
            }

            // 15+ completions - Show the actual count
            return (
              <>
                <Text style={styles.journeyTitle}>Share Your Alumni Journey With Us!</Text>
                <Text style={styles.journeyHighlight}>Help Future Nationalians</Text>
                <Text style={styles.journeyText}>
                  Your feedback shapes NU LIPA's programs and curriculum!
                </Text>
                <View style={styles.mascotContainer}>
                  <Image source={mascotImg} style={styles.mascotImage} />
                </View>
                <View style={styles.alumniCountContainer}>
                  <Text style={styles.alumniCountText}>
                    Join{' '}
                    <Text style={styles.alumniCountNumber}>
                      {completedAlumniCount.toLocaleString()}
                    </Text>{' '}
                    alumni who've already completed their tracer!
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            Your responses help chart the course for future explorers
          </Text>
          <Text style={styles.footerStars}>✦  ✦  ✦</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TracerMenuScreen;