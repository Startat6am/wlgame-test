# WLGame balance notes

## Scope

This is a provisional balance sheet for the first playable combat milestone. It is inspired by Warlock Arena 0.88/0.88b, but it is not a recovered copy of the protected map data.

## Evidence labels

- `confirmed_088`: explicitly stated in the original 0.88/0.88b public patch notes.
- `reference_other_version`: documented for another Warlock version or related handbook; useful as a reference only.
- `estimated`: temporary WLGame tuning value, to be tested and adjusted.

The machine-readable values live in `src/game/data/ability-balance.json`. Each numeric gameplay value carries its own evidence status.

## Confirmed 0.88 facts currently encoded

- Fire Spray Cluster damage: 3.4 + 0.4 per upgrade.
- Gravity purchase price: 15.
- Aegis purchase price: 17.
- Boomerang alternates its direction with each shot rather than choosing randomly.
- Ranged Mastery increases projectile travel distance by 10% per level; Lightning range by 15%.
- AoE Mastery increases explosion radius by 12% per level, with documented exceptions.

## Provisional prototype scale

- 100 maximum health is a convenience scale, not an original stat.
- Lava damage of 9 HP/s is borrowed from a later Warlock 0.91 reference, not confirmed for 0.88.
- Movement speed 230 matches the existing movement prototype.
- Knockback scales with accumulated damage points using a provisional coefficient of 0.012.

## Important combat rule

Warlock references describe damage points increasing later knockback. WLGame should therefore not model combat as health-only damage. The provisional formula is:

`knockback = baseKnockback * abilityMultiplier * (1 + damagePoints * damagePointKnockbackScale)`

This coefficient is a placeholder and must be tuned through repeatable tests.

## Known gaps

The public sources do not expose the complete 0.88b numerical data for all 21 abilities, all 49 combinations, all four modes, or the original physics constants. Do not fill these gaps with fabricated claims. Add mechanics and values as evidence becomes available or clearly label new design decisions as estimates.

## Next implementation gate

Before adding more abilities, implement the shared combat primitives and test them: damage points, knockback, projectile hit handling, cooldowns, and lava damage. Keep the rules independent of Phaser so the same rules can later run authoritatively on the server and in bot matches.
