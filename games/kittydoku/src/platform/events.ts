import type { Platform } from './platform';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

/**
 * Event tracking for Kitty Doku following Arkadium AppInsights specification.
 * 
 * Events map to Azure AppInsights with the following structure:
 * - Event Category (e.g., "Game", "Click", "Booster")
 * - Event Action (e.g., "Start", "End", "Used")
 * - Event Label/Properties (custom dimensions)
 */

const INSTRUMENTATION_KEY = 'eda7fc09-881c-4589-b97d-a00241afd3e2';

export type GameEvent =
  // App_Started - after preroll ends, game is ready
  | { type: 'app_started' }
  
  // Click - Ruleset - user clicks "How to Play"
  | { type: 'click_ruleset' }
  
  // Game - Start - any level start (including tutorial)
  | { 
      type: 'game_start';
      game_mode: string;
      level: string | number;
      level_group: string;
    }
  
  // Game - End - level completed successfully
  | { 
      type: 'game_end';
      game_mode: string;
      level: string | number;
      level_group: string;
    }
  
  // Game - Quit - user exits level without completing
  | { 
      type: 'game_quit';
      game_mode: string;
      level: string | number;
      level_group: string;
    }
  
  // Booster - Used - hints, undo, restart
  | { 
      type: 'booster_used';
      booster_type: 'UNDO' | 'HINT' | 'RESTART';
      quantity: number;
      game_mode: string;
      level: string | number;
      level_group: string;
    };

interface EventTracker {
  track(event: GameEvent): void;
  flush(): Promise<void>;
}

/**
 * Converts Kitty Doku events to Arkadium AppInsights format.
 * Maps event types to category/action pairs with properties.
 */
function toAppInsightsEvent(event: GameEvent): {
  category: string;
  action: string;
  properties?: Record<string, string | number>;
} {
  switch (event.type) {
    case 'app_started':
      return { category: 'App_Started', action: '' };
    
    case 'click_ruleset':
      return { category: 'Click', action: 'Ruleset' };
    
    case 'game_start':
      return {
        category: 'Game',
        action: 'Start',
        properties: {
          game_mode: event.game_mode,
          level: event.level,
          level_group: event.level_group,
        },
      };
    
    case 'game_end':
      return {
        category: 'Game',
        action: 'End',
        properties: {
          game_mode: event.game_mode,
          level: event.level,
          level_group: event.level_group,
        },
      };
    
    case 'game_quit':
      return {
        category: 'Game',
        action: 'Quit',
        properties: {
          game_mode: event.game_mode,
          level: event.level,
          level_group: event.level_group,
        },
      };
    
    case 'booster_used':
      return {
        category: 'Booster',
        action: 'Used',
        properties: {
          type: event.booster_type,
          quantity: event.quantity,
          game_mode: event.game_mode,
          level: event.level,
          level_group: event.level_group,
        },
      };
  }
}

class PlatformEventTracker implements EventTracker {
  private platform: Platform;
  private queue: GameEvent[] = [];
  private flushTimer: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly MAX_QUEUE_SIZE = 20;
  private appInsights: ApplicationInsights | null = null;

  constructor(platform: Platform) {
    this.platform = platform;
    
    // Initialize AppInsights only in Arkadium builds
    if (platform.name === 'arkadium') {
      try {
        this.appInsights = new ApplicationInsights({
          config: {
            instrumentationKey: INSTRUMENTATION_KEY,
            enableAutoRouteTracking: false, // We don't need automatic page tracking
            disableFetchTracking: true,     // Don't track HTTP requests
            disableAjaxTracking: true,      // Don't track AJAX calls
          }
        });
        this.appInsights.loadAppInsights();
        console.info('[Events] AppInsights initialized');
      } catch (e) {
        console.warn('[Events] Failed to initialize AppInsights:', e);
        this.appInsights = null;
      }
    }
    
    this.startFlushTimer();
  }

  track(event: GameEvent): void {
    this.queue.push(event);
    
    // Log events only in local development for debugging
    if (this.platform.name === 'local') {
      const appInsightsEvent = toAppInsightsEvent(event);
      console.log('[Event]', appInsightsEvent.category, appInsightsEvent.action, appInsightsEvent.properties || {});
    }

    // Flush immediately if queue is getting large
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    // Send events to AppInsights
    if (this.appInsights) {
      events.forEach(event => {
        const aiEvent = toAppInsightsEvent(event);
        
        // AppInsights trackEvent format: name and properties
        // We combine category and action as the event name
        const eventName = aiEvent.action 
          ? `${aiEvent.category}.${aiEvent.action}`
          : aiEvent.category;
        
        this.appInsights!.trackEvent({
          name: eventName,
          properties: aiEvent.properties || {}
        });
      });
      
      // Force AppInsights to send immediately
      this.appInsights.flush();
    }

    // Clear events after processing
    events.length = 0;
  }

  private startFlushTimer(): void {
    if (this.flushTimer !== null) {
      window.clearInterval(this.flushTimer);
    }
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  destroy(): void {
    if (this.flushTimer !== null) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

let tracker: EventTracker | null = null;

export function initEventTracking(platform: Platform): void {
  if (tracker) {
    console.warn('[Events] Event tracking already initialized');
    return;
  }
  tracker = new PlatformEventTracker(platform);
  
  // Track app started (after preroll)
  trackEvent({ type: 'app_started' });
}

export function trackEvent(event: GameEvent): void {
  if (!tracker) {
    console.warn('[Events] Tracker not initialized, call initEventTracking first');
    return;
  }
  tracker.track(event);
}

export function destroyEventTracking(): void {
  if (tracker && 'destroy' in tracker) {
    (tracker as PlatformEventTracker).destroy();
  }
  tracker = null;
}

// ---------------------------------------------------------------- Convenience functions

/**
 * Helper to build level context for events.
 * @param levelNum 1-based level number, or "Tutorial" for tutorial levels
 * @param levelGroup The world/chapter name (e.g., "Ginger Meadows", "Tutorial")
 */
function levelContext(levelNum: number | string, levelGroup: string) {
  return {
    game_mode: 'Adventure', // Could be extended for future game modes
    level: levelNum,
    level_group: levelGroup,
  };
}

export function trackAppStarted(): void {
  trackEvent({ type: 'app_started' });
}

export function trackClickRuleset(): void {
  trackEvent({ type: 'click_ruleset' });
}

export function trackGameStart(levelNum: number | string, levelGroup: string): void {
  trackEvent({ 
    type: 'game_start',
    ...levelContext(levelNum, levelGroup),
  });
}

export function trackGameEnd(levelNum: number | string, levelGroup: string): void {
  trackEvent({ 
    type: 'game_end',
    ...levelContext(levelNum, levelGroup),
  });
}

export function trackGameQuit(levelNum: number | string, levelGroup: string): void {
  trackEvent({ 
    type: 'game_quit',
    ...levelContext(levelNum, levelGroup),
  });
}

export function trackBoosterUsed(
  boosterType: 'UNDO' | 'HINT' | 'RESTART',
  levelNum: number | string,
  levelGroup: string,
  quantity: number = 1
): void {
  trackEvent({
    type: 'booster_used',
    booster_type: boosterType,
    quantity,
    ...levelContext(levelNum, levelGroup),
  });
}
