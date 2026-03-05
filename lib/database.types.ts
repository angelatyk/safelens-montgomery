export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            incidents: { Row: any; Insert: any; Update: any }
            neighborhoods: { Row: any; Insert: any; Update: any }
            news_articles: { Row: any; Insert: any; Update: any }
            resident_reports: { Row: any; Insert: any; Update: any }
            alerts: { Row: any; Insert: any; Update: any }
            narratives: { Row: any; Insert: any; Update: any }
            users: { Row: any; Insert: any; Update: any }
        }
    }
}