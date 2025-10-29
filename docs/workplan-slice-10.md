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

### Phase 1: Color Helper & Config
**Time:** 30 min

**Task 1.1: Add color computation helper**
- Add `getSubduedColor(hex: string): string` to `config.ts`
- Convert hex → HSL → increase lightness to 70% → convert back
- Test with `COLORS.people` and `COLORS.projects`

**Task 1.2: Add departure configs**
- Add `leaving` config to `LAYOUT.particleAnimations.people`:
  - `spawnOffsetY: -60` (below lane, animates upward/away)
  - `fadeOutDuration: 600` (slower than joins)
  - Computed colors (call helper during instantiation)
  - Reuse: radius, labelOffset, fontSize, etc.
- Add `ending` config to `LAYOUT.particleAnimations.projects`:
  - `spawnOffsetY: 60` (above lane, animates upward/away)
  - `fadeOutDuration: 600` (slower than starts)
  - Computed colors (call helper during instantiation)
  - Reuse: radius, labelOffset, fontSize, etc.

---

### Phase 2: Instantiate Controllers
**Time:** 45 min

**Task 2.1: Instantiate peopleLeaving controller**
- Filter `data.people` where `left !== null`
- Date accessor: `(p) => p.left!`
- Config: spread `people.leaving`, compute colors inline
- Place after `peopleJoining` in `main.ts`

**Task 2.2: Instantiate projectsEnding controller**
- Filter `data.projects` where `end !== null`
- Date accessor: `(p) => p.end!`
- Config: spread `projects.ending`, compute colors inline
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
- [ ] Subdued colors computed programmatically
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
- **Decision:** HSL lightness adjustment (~70%)
- **Rationale:** Precise control over color, maintains hue
- **Alternative:** Opacity - simpler but less control

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

