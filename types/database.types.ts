export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      battle_pass_progress: {
        Row: {
          claimed_tiers: number[]
          current_tier: number
          current_xp: number
          is_premium: boolean
          premium_purchased_at: string | null
          season_id: string
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_tiers?: number[]
          current_tier?: number
          current_xp?: number
          is_premium?: boolean
          premium_purchased_at?: string | null
          season_id: string
          track: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_tiers?: number[]
          current_tier?: number
          current_xp?: number
          is_premium?: boolean
          premium_purchased_at?: string | null
          season_id?: string
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          reward_cosmetic_id: string | null
          reward_nectar: number
          reward_xp: number
          target_metric: string
          target_value: number
          tier: string
          title: string
          type: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id: string
          is_active?: boolean
          reward_cosmetic_id?: string | null
          reward_nectar?: number
          reward_xp?: number
          target_metric: string
          target_value: number
          tier?: string
          title: string
          type: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          reward_cosmetic_id?: string | null
          reward_nectar?: number
          reward_xp?: number
          target_metric?: string
          target_value?: number
          tier?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          best_wpm: number | null
          correct_words: number | null
          created_at: string | null
          games_played: number | null
          games_won: number | null
          max_streak: number | null
          nectar_earned: number | null
          stat_date: string
          updated_at: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          best_wpm?: number | null
          correct_words?: number | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          max_streak?: number | null
          nectar_earned?: number | null
          stat_date?: string
          updated_at?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          best_wpm?: number | null
          correct_words?: number | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          max_streak?: number | null
          nectar_earned?: number | null
          stat_date?: string
          updated_at?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      friend_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invitee_id: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code: string
          invitee_id?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invitee_id?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_replays: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          ended_at: string | null
          id: string
          is_public: boolean | null
          is_ranked: boolean | null
          map_name: string | null
          mode: string
          player_count: number
          room_id: string
          season_id: string | null
          started_at: string
          view_count: number | null
          winner_id: string | null
          word_list: string[] | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          is_public?: boolean | null
          is_ranked?: boolean | null
          map_name?: string | null
          mode: string
          player_count: number
          room_id: string
          season_id?: string | null
          started_at: string
          view_count?: number | null
          winner_id?: string | null
          word_list?: string[] | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          is_public?: boolean | null
          is_ranked?: boolean | null
          map_name?: string | null
          mode?: string
          player_count?: number
          room_id?: string
          season_id?: string | null
          started_at?: string
          view_count?: number | null
          winner_id?: string | null
          word_list?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "game_replays_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mode_stats: {
        Row: {
          best_wpm: number | null
          created_at: string | null
          games_played: number | null
          games_won: number | null
          max_streak: number | null
          mode: string
          total_correct_words: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_wpm?: number | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          max_streak?: number | null
          mode: string
          total_correct_words?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_wpm?: number | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          max_streak?: number | null
          mode?: string
          total_correct_words?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_daily_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_friends_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_global_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_mode_leaderboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      player_challenges: {
        Row: {
          challenge_id: string
          claimed_at: string | null
          completed_at: string | null
          current_progress: number
          is_claimed: boolean
          is_completed: boolean
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          is_claimed?: boolean
          is_completed?: boolean
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          is_claimed?: boolean
          is_completed?: boolean
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_seed: string | null
          avatar_url: string | null
          corrects: number | null
          created_at: string
          current_activity: string | null
          current_nectar: number | null
          current_room_id: string | null
          current_streak: number | null
          equipped_badge: string | null
          equipped_cursor: string | null
          equipped_theme: string | null
          games_played: number | null
          id: string
          inventory: Json | null
          invite_code: string | null
          last_seen: string | null
          lifetime_nectar: number | null
          max_streak: number | null
          presence_status: string | null
          tier: string | null
          title: string | null
          updated_at: string | null
          username: string | null
          wins: number | null
        }
        Insert: {
          avatar_seed?: string | null
          avatar_url?: string | null
          corrects?: number | null
          created_at?: string
          current_activity?: string | null
          current_nectar?: number | null
          current_room_id?: string | null
          current_streak?: number | null
          equipped_badge?: string | null
          equipped_cursor?: string | null
          equipped_theme?: string | null
          games_played?: number | null
          id: string
          inventory?: Json | null
          invite_code?: string | null
          last_seen?: string | null
          lifetime_nectar?: number | null
          max_streak?: number | null
          presence_status?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
          username?: string | null
          wins?: number | null
        }
        Update: {
          avatar_seed?: string | null
          avatar_url?: string | null
          corrects?: number | null
          created_at?: string
          current_activity?: string | null
          current_nectar?: number | null
          current_room_id?: string | null
          current_streak?: number | null
          equipped_badge?: string | null
          equipped_cursor?: string | null
          equipped_theme?: string | null
          games_played?: number | null
          id?: string
          inventory?: Json | null
          invite_code?: string | null
          last_seen?: string | null
          lifetime_nectar?: number | null
          max_streak?: number | null
          presence_status?: string | null
          tier?: string | null
          title?: string | null
          updated_at?: string | null
          username?: string | null
          wins?: number | null
        }
        Relationships: []
      }
      ranked_match_history: {
        Row: {
          correct_words: number | null
          created_at: string | null
          game_duration_ms: number | null
          id: number
          max_streak: number | null
          max_wpm: number | null
          mode: string
          opponent_ids: string[]
          place: number | null
          player_id: string
          rating_after: number
          rating_before: number
          rating_change: number
          rd_after: number
          rd_before: number
          result: string
          room_id: string
          season_id: string
          total_players: number
          volatility_after: number
          volatility_before: number
        }
        Insert: {
          correct_words?: number | null
          created_at?: string | null
          game_duration_ms?: number | null
          id?: number
          max_streak?: number | null
          max_wpm?: number | null
          mode: string
          opponent_ids: string[]
          place?: number | null
          player_id: string
          rating_after: number
          rating_before: number
          rating_change: number
          rd_after: number
          rd_before: number
          result: string
          room_id: string
          season_id: string
          total_players: number
          volatility_after: number
          volatility_before: number
        }
        Update: {
          correct_words?: number | null
          created_at?: string | null
          game_duration_ms?: number | null
          id?: number
          max_streak?: number | null
          max_wpm?: number | null
          mode?: string
          opponent_ids?: string[]
          place?: number | null
          player_id?: string
          rating_after?: number
          rating_before?: number
          rating_change?: number
          rd_after?: number
          rd_before?: number
          result?: string
          room_id?: string
          season_id?: string
          total_players?: number
          volatility_after?: number
          volatility_before?: number
        }
        Relationships: []
      }
      ranked_ratings: {
        Row: {
          created_at: string | null
          games_played: number
          id: number
          last_played_at: string | null
          losses: number
          mode: string
          placement_matches_remaining: number
          rating: number
          rd: number
          season_id: string
          updated_at: string | null
          user_id: string
          volatility: number
          wins: number
        }
        Insert: {
          created_at?: string | null
          games_played?: number
          id?: number
          last_played_at?: string | null
          losses?: number
          mode: string
          placement_matches_remaining?: number
          rating?: number
          rd?: number
          season_id: string
          updated_at?: string | null
          user_id: string
          volatility?: number
          wins?: number
        }
        Update: {
          created_at?: string | null
          games_played?: number
          id?: number
          last_played_at?: string | null
          losses?: number
          mode?: string
          placement_matches_remaining?: number
          rating?: number
          rd?: number
          season_id?: string
          updated_at?: string | null
          user_id?: string
          volatility?: number
          wins?: number
        }
        Relationships: []
      }
      replay_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          payload: Json
          player_id: string | null
          replay_id: string
          sequence_number: number
          timestamp_ms: number
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: number
          payload: Json
          player_id?: string | null
          replay_id: string
          sequence_number: number
          timestamp_ms: number
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: number
          payload?: Json
          player_id?: string | null
          replay_id?: string
          sequence_number?: number
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "replay_events_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "game_replays"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_participants: {
        Row: {
          avatar_url: string | null
          correct_words: number | null
          created_at: string | null
          final_place: number | null
          id: number
          max_streak: number | null
          max_wpm: number | null
          rating_after: number | null
          rating_before: number | null
          rating_change: number | null
          replay_id: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          correct_words?: number | null
          created_at?: string | null
          final_place?: number | null
          id?: number
          max_streak?: number | null
          max_wpm?: number | null
          rating_after?: number | null
          rating_before?: number | null
          rating_change?: number | null
          replay_id: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          correct_words?: number | null
          created_at?: string | null
          final_place?: number | null
          id?: number
          max_streak?: number | null
          max_wpm?: number | null
          rating_after?: number | null
          rating_before?: number | null
          rating_change?: number | null
          replay_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_participants_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "game_replays"
            referencedColumns: ["id"]
          },
        ]
      }
      room_keystroke_log: {
        Row: {
          anomaly_reasons: string[] | null
          anomaly_score: number | null
          created_at: string | null
          device_fingerprint: Json | null
          id: number
          keystrokes: Json
          player_id: string
          room_id: string
          submitted_at: string | null
          suspicious: boolean | null
          time_taken_ms: number
          verified: boolean | null
          word: string
          word_length: number
          wpm: number
        }
        Insert: {
          anomaly_reasons?: string[] | null
          anomaly_score?: number | null
          created_at?: string | null
          device_fingerprint?: Json | null
          id?: number
          keystrokes: Json
          player_id: string
          room_id: string
          submitted_at?: string | null
          suspicious?: boolean | null
          time_taken_ms: number
          verified?: boolean | null
          word: string
          word_length: number
          wpm: number
        }
        Update: {
          anomaly_reasons?: string[] | null
          anomaly_score?: number | null
          created_at?: string | null
          device_fingerprint?: Json | null
          id?: number
          keystrokes?: Json
          player_id?: string
          room_id?: string
          submitted_at?: string | null
          suspicious?: boolean | null
          time_taken_ms?: number
          verified?: boolean | null
          word?: string
          word_length?: number
          wpm?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          code: string | null
          created_at: string | null
          game_state: Json | null
          host_id: string
          id: string
          intermission_ends_at: number | null
          players: Json
          settings: Json
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          game_state?: Json | null
          host_id: string
          id: string
          intermission_ends_at?: number | null
          players?: Json
          settings?: Json
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          game_state?: Json | null
          host_id?: string
          id?: string
          intermission_ends_at?: number | null
          players?: Json
          settings?: Json
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          min_rating_for_decay: number | null
          modes: string[]
          name: string
          placement_matches: number
          rating_decay_per_day: number | null
          reward_tiers: Json
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id: string
          is_active?: boolean | null
          min_rating_for_decay?: number | null
          modes?: string[]
          name: string
          placement_matches?: number
          rating_decay_per_day?: number | null
          reward_tiers?: Json
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          min_rating_for_decay?: number | null
          modes?: string[]
          name?: string
          placement_matches?: number
          rating_decay_per_day?: number | null
          reward_tiers?: Json
          start_date?: string
        }
        Relationships: []
      }
      shadow_ban_queue: {
        Row: {
          anomaly_score: number
          created_at: string | null
          flagged_at: string | null
          id: number
          reason: string
          resolution: string | null
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          anomaly_score: number
          created_at?: string | null
          flagged_at?: string | null
          id?: number
          reason: string
          resolution?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          anomaly_score?: number
          created_at?: string | null
          flagged_at?: string | null
          id?: number
          reason?: string
          resolution?: string | null
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_device_fingerprints: {
        Row: {
          created_at: string | null
          fingerprint_id: string
          first_seen_at: string | null
          full_fingerprint: Json
          id: number
          is_trusted: boolean | null
          last_seen_at: string | null
          trust_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fingerprint_id: string
          first_seen_at?: string | null
          full_fingerprint: Json
          id?: number
          is_trusted?: boolean | null
          last_seen_at?: string | null
          trust_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fingerprint_id?: string
          first_seen_at?: string | null
          full_fingerprint?: Json
          id?: number
          is_trusted?: boolean | null
          last_seen_at?: string | null
          trust_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      word_banks: {
        Row: {
          created_at: string | null
          difficulty: string
          id: number
          locale: string
          word: string
        }
        Insert: {
          created_at?: string | null
          difficulty: string
          id?: number
          locale: string
          word: string
        }
        Update: {
          created_at?: string | null
          difficulty?: string
          id?: number
          locale?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_daily_leaderboard: {
        Row: {
          avatar_url: string | null
          daily_correct: number | null
          daily_rank: number | null
          daily_wins: number | null
          daily_xp: number | null
          leaderboard_date: string | null
          tier: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      mv_friends_leaderboard: {
        Row: {
          avatar_url: string | null
          composite_score: number | null
          current_streak: number | null
          friend_group: string | null
          friend_rank: number | null
          games_played: number | null
          games_won: number | null
          lifetime_nectar: number | null
          max_streak: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      mv_global_leaderboard: {
        Row: {
          avatar_url: string | null
          composite_score: number | null
          current_streak: number | null
          games_played: number | null
          games_won: number | null
          global_rank: number | null
          lifetime_nectar: number | null
          max_streak: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      mv_mode_leaderboard: {
        Row: {
          avatar_url: string | null
          best_wpm: number | null
          games_played: number | null
          games_won: number | null
          max_streak: number | null
          mode: string | null
          mode_rank: number | null
          mode_score: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      v_daily_leaderboard: {
        Row: {
          avatar_url: string | null
          daily_correct: number | null
          daily_rank: number | null
          daily_wins: number | null
          daily_xp: number | null
          leaderboard_date: string | null
          tier: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      v_friends_leaderboard: {
        Row: {
          avatar_url: string | null
          composite_score: number | null
          current_streak: number | null
          friend_group: string | null
          friend_rank: number | null
          games_played: number | null
          games_won: number | null
          lifetime_nectar: number | null
          max_streak: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      v_global_leaderboard: {
        Row: {
          avatar_url: string | null
          composite_score: number | null
          current_streak: number | null
          games_played: number | null
          games_won: number | null
          global_rank: number | null
          lifetime_nectar: number | null
          max_streak: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      v_mode_leaderboard: {
        Row: {
          avatar_url: string | null
          best_wpm: number | null
          games_played: number | null
          games_won: number | null
          max_streak: number | null
          mode: string | null
          mode_rank: number | null
          mode_score: number | null
          tier: string | null
          total_correct_words: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_friend_invite: {
        Args: { p_invite_code: string; p_user_id?: string }
        Returns: Json[]
      }
      add_battle_pass_xp:
        | {
            Args: { p_season_id: string; p_user_id: string; p_xp: number }
            Returns: Json
          }
        | {
            Args: { p_season_id: string; p_user_id: string; p_xp: number }
            Returns: Json
          }
      advance_turn: {
        Args: {
          p_new_streak: number
          p_player_id: string
          p_room_id: string
          p_was_correct: boolean
        }
        Returns: Json
      }
      apply_correct_answer_reward: {
        Args: { p_nectar_to_add?: number; p_username?: string }
        Returns: Json
      }
      apply_ranked_decay: { Args: { p_season_id: string }; Returns: undefined }
      auto_flag_suspicious_player: {
        Args: {
          p_anomaly_reasons: string[]
          p_anomaly_score: number
          p_device_fingerprint?: Json
          p_room_id: string
          p_user_id: string
          p_word: string
        }
        Returns: undefined
      }
      award_profile_win: { Args: { p_username?: string }; Returns: Json }
      calculate_profile_title: {
        Args: { p_corrects: number; p_wins: number }
        Returns: string
      }
      check_device_fingerprint_anomaly: {
        Args: { p_fingerprint_id: string; p_user_id: string }
        Returns: {
          anomaly_reason: string
          is_anomaly: boolean
          trust_score: number
        }[]
      }
      check_expired_timers: { Args: never; Returns: number }
      check_stalled_intermissions: { Args: never; Returns: number }
      claim_battle_pass_reward: {
        Args: {
          p_season_id: string
          p_tier: number
          p_track: string
          p_user_id: string
        }
        Returns: Json
      }
      claim_challenge_reward: {
        Args: { p_challenge_id: string; p_season_id: string; p_user_id: string }
        Returns: {
          message: string
          reward_nectar: number
          reward_xp: number
          success: boolean
        }[]
      }
      cleanup_abandoned_rooms: { Args: never; Returns: number }
      create_direct_friend_invite: {
        Args: { p_invitee_id: string; p_user_id?: string }
        Returns: Json[]
      }
      create_friend_invite: { Args: { p_user_id?: string }; Returns: Json[] }
      create_replay: {
        Args: {
          p_duration_ms: number
          p_ended_at: string
          p_events: Json
          p_is_public: boolean
          p_is_ranked: boolean
          p_map_name: string
          p_mode: string
          p_participants: Json
          p_player_count: number
          p_room_id: string
          p_season_id: string
          p_started_at: string
          p_winner_id: string
          p_word_list: string[]
        }
        Returns: {
          replay_id: string
        }[]
      }
      current_user_id: { Args: never; Returns: string }
      decline_friend_invite: {
        Args: { p_invite_code: string; p_user_id?: string }
        Returns: undefined
      }
      eliminate_player: {
        Args: { p_player_id: string; p_reason: string; p_room_id: string }
        Returns: Json
      }
      ensure_player_challenges: {
        Args: { p_season_id: string; p_user_id: string }
        Returns: undefined
      }
      flag_for_shadow_ban: {
        Args: { p_anomaly_score: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_battle_pass_state: {
        Args: { p_season_id: string; p_user_id: string }
        Returns: Json
      }
      get_challenge_summary: {
        Args: { p_season_id: string; p_user_id: string }
        Returns: {
          daily_claimed: number
          daily_completed: number
          daily_reset_at: string
          daily_total: number
          weekly_claimed: number
          weekly_completed: number
          weekly_reset_at: string
          weekly_total: number
        }[]
      }
      get_daily_leaderboard: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_season_id?: string
          p_viewer_id?: string
        }
        Returns: {
          avatar_url: string
          daily_correct: number
          daily_rank: number
          daily_wins: number
          daily_xp: number
          is_current_user: boolean
          leaderboard_date: string
          tier: string
          user_id: string
          username: string
        }[]
      }
      get_friends_leaderboard: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_season_id?: string
          p_viewer_id?: string
        }
        Returns: {
          avatar_url: string
          composite_score: number
          friend_group: string
          friend_rank: number
          is_current_user: boolean
          tier: string
          user_id: string
          username: string
        }[]
      }
      get_friends_with_presence: {
        Args: { p_user_id?: string }
        Returns: Json[]
      }
      get_global_leaderboard: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_season_id?: string
          p_viewer_id?: string
        }
        Returns: {
          avatar_url: string
          composite_score: number
          global_rank: number
          is_current_user: boolean
          tier: string
          user_id: string
          username: string
        }[]
      }
      get_mode_leaderboard: {
        Args: {
          p_limit?: number
          p_mode: string
          p_offset?: number
          p_season_id?: string
          p_viewer_id?: string
        }
        Returns: {
          avatar_url: string
          best_wpm: number
          games_played: number
          games_won: number
          is_current_user: boolean
          max_streak: number
          mode: string
          mode_rank: number
          mode_score: number
          tier: string
          total_correct_words: number
          user_id: string
          username: string
        }[]
      }
      get_online_friends: { Args: { p_user_id?: string }; Returns: Json[] }
      get_pending_invites: { Args: { p_user_id?: string }; Returns: Json[] }
      get_player_challenges: {
        Args: { p_season_id: string; p_user_id: string }
        Returns: {
          category: string
          challenge_id: string
          current_progress: number
          description: string
          is_claimed: boolean
          is_completed: boolean
          reward_cosmetic_id: string
          reward_nectar: number
          reward_xp: number
          target_metric: string
          target_value: number
          tier: string
          title: string
          type: string
        }[]
      }
      get_player_rank: {
        Args: { p_mode?: string; p_season_id?: string; p_user_id: string }
        Returns: {
          leaderboard_type: string
          metadata: Json
          rank: number
          score: number
          total_players: number
        }[]
      }
      get_ranked_leaderboard: {
        Args: {
          p_limit: number
          p_mode: string
          p_offset: number
          p_season_id: string
        }
        Returns: {
          avatar_url: string
          games_played: number
          losses: number
          rank: number
          rating: number
          rd: number
          tier: string
          user_id: string
          username: string
          win_rate: number
          wins: number
        }[]
      }
      get_ranked_rating: {
        Args: { p_mode: string; p_season_id: string; p_user_id: string }
        Returns: {
          games_played: number
          last_played_at: string
          losses: number
          mode: string
          placement_matches_remaining: number
          rating: number
          rd: number
          season_id: string
          tier: string
          user_id: string
          volatility: number
          wins: number
        }[]
      }
      get_replay: {
        Args: { p_replay_id: string }
        Returns: {
          created_at: string
          duration_ms: number
          ended_at: string
          id: string
          is_public: boolean
          is_ranked: boolean
          map_name: string
          mode: string
          player_count: number
          room_id: string
          season_id: string
          started_at: string
          view_count: number
          winner_id: string
          word_list: string[]
        }[]
      }
      get_replay_events: {
        Args: { p_replay_id: string }
        Returns: {
          event_type: string
          payload: Json
          player_id: string
          sequence_number: number
          timestamp_ms: number
        }[]
      }
      get_replay_participants: {
        Args: { p_replay_id: string }
        Returns: {
          avatar_url: string
          correct_words: number
          final_place: number
          max_streak: number
          max_wpm: number
          rating_after: number
          rating_before: number
          rating_change: number
          user_id: string
          username: string
        }[]
      }
      get_sent_invites: { Args: { p_user_id?: string }; Returns: Json[] }
      get_shadow_ban_queue: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_unreviewed_only?: boolean
        }
        Returns: {
          anomaly_score: number
          avatar_url: string
          flagged_at: string
          id: number
          reason: string
          resolution: string
          resolution_notes: string
          reviewed_at: string
          reviewed_by: string
          user_id: string
          username: string
        }[]
      }
      glicko2_mu_from_rating: { Args: { p_rating: number }; Returns: number }
      glicko2_phi_from_rd: { Args: { p_rd: number }; Returns: number }
      glicko2_rating_from_mu: { Args: { p_mu: number }; Returns: number }
      glicko2_rd_from_phi: { Args: { p_phi: number }; Returns: number }
      glicko2_update_rating: {
        Args: {
          p_opponent_ratings: number[]
          p_opponent_rds: number[]
          p_rating: number
          p_rd: number
          p_scores: number[]
          p_tau: number
          p_volatility: number
        }
        Returns: {
          new_rating: number
          new_rd: number
          new_volatility: number
        }[]
      }
      increment_daily_stats: {
        Args: {
          p_correct_words?: number
          p_games_played?: number
          p_games_won?: number
          p_nectar_earned?: number
          p_streak?: number
          p_user_id: string
          p_wpm?: number
          p_xp_earned?: number
        }
        Returns: undefined
      }
      increment_mode_stats: {
        Args: {
          p_correct_words?: number
          p_games_played?: number
          p_games_won?: number
          p_mode: string
          p_streak?: number
          p_user_id: string
          p_wpm?: number
        }
        Returns: undefined
      }
      increment_replay_view_count: {
        Args: { p_replay_id: string }
        Returns: undefined
      }
      is_shadow_banned: {
        Args: { p_user_id: string }
        Returns: {
          flagged_at: string
          is_shadow_banned: boolean
          reason: string
        }[]
      }
      list_replays: {
        Args: {
          p_is_ranked?: boolean
          p_limit?: number
          p_mode?: string
          p_offset?: number
          p_season_id?: string
          p_user_id?: string
        }
        Returns: {
          created_at: string
          duration_ms: number
          ended_at: string
          id: string
          map_name: string
          mode: string
          player_count: number
          room_id: string
          season_id: string
          started_at: string
          view_count: number
          winner_id: string
        }[]
      }
      log_keystroke_data: {
        Args: {
          p_device_fingerprint: Json
          p_keystrokes: Json
          p_player_id: string
          p_room_id: string
          p_time_taken_ms: number
          p_word: string
          p_word_length: number
          p_wpm: number
        }
        Returns: undefined
      }
      pick_word: {
        Args: { p_difficulty: string; p_locale: string; p_room_id: string }
        Returns: Json
      }
      purchase_battle_pass_premium: {
        Args: { p_season_id: string; p_user_id: string }
        Returns: Json
      }
      purchase_item: {
        Args: { category: string; cost: number; item_id: string }
        Returns: Json
      }
      refresh_leaderboards: { Args: never; Returns: undefined }
      register_device_fingerprint: {
        Args: {
          p_fingerprint_id: string
          p_full_fingerprint: Json
          p_user_id: string
        }
        Returns: {
          is_new: boolean
          trust_score: number
        }[]
      }
      resolve_shadow_ban: {
        Args: {
          p_admin_id: string
          p_notes?: string
          p_queue_id: number
          p_resolution: string
        }
        Returns: undefined
      }
      restart_round: { Args: { p_room_id: string }; Returns: Json }
      start_game: {
        Args: { p_difficulty: string; p_locale: string; p_room_id: string }
        Returns: Json
      }
      sum_vec: { Args: { p_arr: number[] }; Returns: number }
      update_challenge_progress: {
        Args: {
          p_game_won?: boolean
          p_increment?: number
          p_metric: string
          p_perfect_round?: boolean
          p_season_id: string
          p_unique_words?: string[]
          p_user_id: string
        }
        Returns: {
          challenge_id: string
          current_progress: number
          is_completed: boolean
          newly_completed: boolean
        }[]
      }
      update_presence: {
        Args: {
          p_activity?: string
          p_room_id?: string
          p_status: string
          p_user_id?: string
        }
        Returns: undefined
      }
      update_ranked_rating: {
        Args: {
          p_correct_words: number
          p_game_duration_ms: number
          p_max_streak: number
          p_max_wpm: number
          p_mode: string
          p_opponent_ids: string[]
          p_place: number
          p_player_id: string
          p_result: string
          p_room_id: string
          p_season_id: string
          p_total_players: number
        }
        Returns: {
          new_rating: number
          new_rd: number
          new_volatility: number
          rating_change: number
          was_placement: boolean
        }[]
      }
      verify_keystroke_log: {
        Args: { p_player_id: string; p_room_id: string; p_word: string }
        Returns: {
          anomaly_reasons: string[]
          anomaly_score: number
          is_suspicious: boolean
          verified: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
