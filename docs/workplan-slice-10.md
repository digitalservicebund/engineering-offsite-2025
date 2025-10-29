# Slice 10 Implementation Plan: Departure Particles (People & Projects)

**Status:** Ready for Implementation  
**Created:** 2025-10-29  
**Estimated Time:** 2-3 hours (high code reuse)

---

## Summary

Add departure particle animations by instantiating 2 additional `ParticleAnimationController<T>` instances for people leaving and projects ending. Particles animate upward (away from lanes), use subdued colors, and fade slower (600ms vs 300ms) for contemplative feel.

**Key insight:** Generic controller already exists from Slices 6 & 9. This is primarily configuration + instantiation work.

---

## Context

### ✅ Already in Place:
- Generic `ParticleAnimationController<T>` (Slice 9)
- People join + project start particles working (Slices 6 & 9)
- Configuration pattern in `LAYOUT.particleAnimations.{people,projects}`
- Spawn detection, SVG creation, animation loop all generic
- Integration pattern with viewport updates and cleanup

### 🆕 To Add:
- Color computation helper for subdued colors
- Departure particle configurations (people.leaving, projects.ending)
- 2 new controller instances (peopleLeaving, projectsEnding)
- Wire 2 new controllers into update/cleanup callbacks

---

## Task Breakdown

### Phase 1: Color Helper & Config ✅
**Time:** 30 min (Complete)

**Task 1.1: Add subdued opacity to config** ✅
- ✅ Added `subduedOpacity: 0.6` to `LAYOUT.particleAnimations`
- ✅ Simple opacity-based approach (use base color with fill-opacity in SVG)
- ✅ Much simpler than HSL conversion - 1 line vs 70 lines
- ✅ Accessed as `LAYOUT.particleAnimations.subduedOpacity`
- ✅ Build succeeds

**Task 1.2: Add departure configs** ✅
- ✅ Restructured `LAYOUT.particleAnimations.people` with `joining` and `leaving` sub-configs
- ✅ Added `leaving` config:
  - `spawnOffsetY: -60` (below lane, animates upward/away)
  - `fadeOutDuration: 600` (slower than joins: 300ms)
  - Same colors as joining (subdued appearance via fill-opacity)
  - Reuses all other properties (radius, labelOffset, fontSize, etc.)
- ✅ Restructured `LAYOUT.particleAnimations.projects` with `starting` and `ending` sub-configs
- ✅ Added `ending` config:
  - `spawnOffsetY: 60` (above lane, animates upward/away)
  - `fadeOutDuration: 600` (slower than starting: 300ms)
  - Same colors as starting (subdued appearance via fill-opacity)
  - Reuses all other properties (radius, labelOffset, fontSize, etc.)
- ✅ Updated existing references in `main.ts` to `.people.joining` and `.projects.starting`
- ✅ Build succeeds

---

### Phase 2: Instantiate Controllers
**Time:** 45 min

**Task 2.1: Instantiate peopleLeaving controller**
- Filter `data.people` where `left !== null`
- Date accessor: `(p) => p.left!`
- Config: spread `people.leaving` config
- Place after `peopleJoining` in `main.ts`

**Task 2.2: Instantiate projectsEnding controller**
- Filter `data.projects` where `end !== null`
- Date accessor: `(p) => p.end!`
- Config: spread `projects.ending` config
- Place after `projectsStarting` in `main.ts`

**Task 2.3: Verify build succeeds**
- Run `npm run build`
- Fix any TypeScript errors

---

### Phase 3: Integration
**Time:** 30 min

**Task 3.1: Wire into viewport updates**
- Add to `updateParticles` callback:
  ```typescript
  peopleLeaving.update(currentPositionX);
  projectsEnding.update(currentPositionX);
  ```

**Task 3.2: Wire into cleanup**
- Add to Left Arrow handler:
  ```typescript
  peopleLeaving.cleanup();
  projectsEnding.cleanup();
  ```
- Update `setupKeyboardControls` signature (now 6 controllers)

**Task 3.3: Verify integration**
- Build succeeds
- No TypeScript errors

---

### Phase 4: Manual Testing
**Time:** 30-45 min

**All tasks require visual verification:**

**Task 4.1: Test people leaving** (Manual)
- Scroll to see departures (check data.json for dates)
- Verify: Light blue particles, upward from below lane, 600ms fade
- Check specific people who left (data has several)

**Task 4.2: Test projects ending** (Manual)
- Mobile App ends 2022-12-31 (only project with end date in data)
- Verify: Light green particle, upward from above lane, 600ms fade

**Task 4.3: Test all 4 particle types together** (Manual)
- Joins (up to lane), Starts (down to lane), Leaves (up from lane), Ends (up from lane)
- Verify no interference, all animate correctly
- Check color difference (subdued vs full saturation)

---

## Success Criteria

### Core Functionality (All Auto-Verified via Code Review)
- [ ] 4 controllers instantiated: joining, leaving, starting, ending
- [ ] Subdued appearance via LAYOUT.particleAnimations.subduedOpacity (0.6)
- [ ] Departure particles use 600ms fade (vs 300ms for arrivals)
- [ ] People leaving: spawn below lane, animate upward
- [ ] Projects ending: spawn above lane, animate upward
- [ ] All wired into update/cleanup callbacks

### Visual (Manual Verification Required)
- [ ] Light blue particles for people leaving (subdued from #4A90E2)
- [ ] Light green particles for projects ending (subdued from #7ED321)
- [ ] Slower fade feels more contemplative (600ms)
- [ ] Upward motion away from lanes for both types
- [ ] All 4 particle types work simultaneously

---

## Technical Decisions

**1. Subdued Color Approach**
- **Decision:** Opacity-based (SUBDUED_OPACITY = 0.6 via SVG fill-opacity)
- **Rationale:** Simplest solution - 1 constant vs 70 lines of HSL conversion
- **Alternative:** HSL lightness - overly complex for this use case

**2. Controller Count**
- **Decision:** 6 separate instances (joining, leaving, starting, ending, + existing 2)
- **Rationale:** Explicit, follows proven pattern from Slice 9
- **Alternative:** Dual-event controllers - more complex, no benefit

**3. Config Structure**
- **Decision:** Separate `leaving`/`ending` configs with shared base values
- **Rationale:** Clear separation, easy to tune independently
- **Alternative:** Single config with flags - less clear

---

## Data Context

From `data.json`:
- **People leaving:** ~25 people have `left` dates (good test coverage)
- **Projects ending:** Mobile App ends 2022-12-31 (1 test case)
- **People joining:** ~50 people (already working)
- **Projects starting:** 3 projects (already working)

**Test timeline positions:**
- 2022-12-31: Mobile App ends (project end particle)
- Various: People departures throughout (people leave particles)

---

## Estimated Complexity

| Phase | Time | Complexity |
|-------|------|------------|
| 1. Config & Helper | 30 min | Low |
| 2. Controllers | 45 min | Low (copy/modify) |
| 3. Integration | 30 min | Low (add 2 lines) |
| 4. Testing | 30-45 min | Low (visual verify) |
| **Total** | **2-3 hours** | **Low** |

**Risk:** Very low - 100% code reuse, proven pattern

---

## References

- **Slice 6:** People join particles (original implementation)
- **Slice 9:** Generic `ParticleAnimationController<T>` (framework)
- **Slice 8:** Generic pattern lessons (direct usage, configuration-driven)
- **Spec FR-006:** Departure indicators (adapted to particles)

---

**Document Status:** Ready for Implementation  
**Next Step:** Task 1.1 - Add color helper function

