// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 INTEGRATION GUIDE — How to plug Hacker System into existing workflows
// ═══════════════════════════════════════════════════════════════════════════════
//
// This file shows the CODE PATCHES needed to integrate the recon system
// into your existing post-to-x.js and post-to-moltbook.js scripts.
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 1: Add to your EXISTING post-to-x.js / post-to-moltbook.js
// ═══════════════════════════════════════════════════════════════════════════════
//
// At the top of the file, add this import:
//
//   const { pickIntel, markUsed, getReconPrompt, hasIntel } = require('../lib/intel-picker');
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 2: Add "recon_drop" to your mode selection
// ═══════════════════════════════════════════════════════════════════════════════
//
// In your mode selection logic (where you pick between regular, comedy, etc.),
// add a recon_drop option. ~15% chance when intel is available:
//
//   // Example mode selection with recon_drop
//   function selectMode() {
//     const modes = ['regular', 'comedy', 'hot_take', 'cultural', 'promo_nightclub'];
//     
//     // 15% chance of recon_drop IF intel is available
//     if (hasIntel() && Math.random() < 0.15) {
//       return 'recon_drop';
//     }
//     
//     return modes[Math.floor(Math.random() * modes.length)];
//   }
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 3: Handle recon_drop mode in your prompt builder
// ═══════════════════════════════════════════════════════════════════════════════
//
// In the function that builds the LLM prompt, add a case for recon_drop:
//
//   if (mode === 'recon_drop') {
//     const intel = pickIntel({ count: 1, minJuiciness: 6 });
//     if (intel.length > 0) {
//       const reconSection = getReconPrompt(intel);
//       // Append to your system prompt or user prompt
//       prompt += reconSection;
//       
//       // IMPORTANT: After posting, mark intel as used
//       // (do this in the success callback after the post is confirmed)
//       // markUsed(intel);
//     } else {
//       // Fallback to regular mode if no intel available
//       mode = 'regular';
//     }
//   }
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 4: Add recon-intel.json to your workflow cache steps
// ═══════════════════════════════════════════════════════════════════════════════
//
// In post-to-x.yml and post-to-moltbook.yml, add this cache step:
//
//   - name: 🕵️ Restore recon intel
//     uses: actions/cache@v4
//     with:
//       path: .gillito-recon-intel.json
//       key: recon-intel-${{ github.run_id }}
//       restore-keys: recon-intel-
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// PATCH 5: Mark used after successful post
// ═══════════════════════════════════════════════════════════════════════════════
//
// After confirming the tweet/molt was posted successfully:
//
//   if (mode === 'recon_drop' && selectedIntel) {
//     markUsed(selectedIntel);
//     console.log('🕵️ Intel marked as used');
//   }
//
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// FULL EXAMPLE: Minimal recon_drop integration
// ═══════════════════════════════════════════════════════════════════════════════

const { pickIntel, markUsed, getReconPrompt, hasIntel, getIntelStats } = require('../lib/intel-picker');

/**
 * Example of a complete recon_drop flow
 * Copy/adapt this pattern into your existing posting scripts
 */
async function exampleReconDropFlow() {
  // 1. Check if we should do a recon_drop
  const shouldRecon = hasIntel() && Math.random() < 0.15;
  
  if (!shouldRecon) {
    console.log('🎲 Not doing recon_drop this time');
    return null;
  }

  console.log('🕵️ RECON DROP MODE ACTIVATED');

  // 2. Pick the best intel
  const intel = pickIntel({ count: 1, minJuiciness: 6 });
  if (intel.length === 0) {
    console.log('⚠️ No intel available, falling back to regular');
    return null;
  }

  console.log(`🎯 Selected: [${intel[0].juiciness}/10] ${intel[0].headline}`);

  // 3. Generate the prompt injection
  const reconPrompt = getReconPrompt(intel);
  
  // 4. This would be appended to your existing Groq/OpenAI call
  //    alongside Gillito's personality.json system prompt
  console.log('📝 Recon prompt ready for LLM injection');
  console.log(reconPrompt);

  // 5. After successful post:
  // markUsed(intel);
  // console.log('✅ Intel marked as used');

  return { intel, reconPrompt };
}

// Show stats if run directly
if (require.main === module) {
  console.log('📊 Intel Stats:', JSON.stringify(getIntelStats(), null, 2));
  console.log('');
  console.log('🎯 Test pick:');
  const pick = pickIntel({ count: 3 });
  for (const item of pick) {
    console.log(`   [${item.juiciness}/10] ${item.headline}`);
    console.log(`   └─ ${item.gillito_angles?.[0]}`);
  }
}

module.exports = { exampleReconDropFlow };
