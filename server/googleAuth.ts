import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import { type User as SelectUser } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function generateToken(user: SelectUser): string {
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
  console.log(`🎫 [JWT] Generated token for user ${user.id}: ${token.substring(0, 10)}...`);
  return token;
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export const jwtAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (authHeader) {
    console.log("🔍 [JWT Middleware] Raw Auth Header:", authHeader);
  }

  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      const token = parts[1];
      console.log("🔍 [JWT Middleware] Verifying token snippet:", token.substring(0, 10) + "...");
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        try {
          const user = await storage.getUser(decoded.id);
          if (user) {
            console.log("✅ [JWT Middleware] Authenticated user:", user.id);
            req.user = user;
            (req as any).isAuthenticated = () => true;
            (req as any)._passport = { instance: passport };
            return next();
          } else {
            console.warn("⚠️ [JWT Middleware] User ID in token not found in database:", decoded.id);
          }
        } catch (error) {
          console.error("❌ [JWT Middleware] User lookup failed:", error);
        }
      } else {
        console.warn("⚠️ [JWT Middleware] Token verification failed or no ID in payload. Token snippet:", token.substring(0, 10));
      }
    } else {
      console.warn("⚠️ [JWT Middleware] Invalid Authorization header format:", authHeader);
    }
  } else if (authHeader) {
    console.warn("⚠️ [JWT Middleware] Authorization header type:", typeof authHeader, "Value snippet:", String(authHeader).substring(0, 20));
  }
  next();
};

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  console.log("🔄 [Session Store] Initializing PostgreSQL session store...");
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("connect", () => {
    console.log("✅ [Session Store] Pool connected to database");
  });

  pool.on("error", (err) => {
    console.error("❌ [Session Store] Pool error:", err.message);
  });
  
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error) => {
      console.error("❌ [Session Store Error]", error);
    },
  });
  
  sessionStore.on("connect", () => {
    console.log("✅ [Session Store] Connected to database");
  });
  
  sessionStore.on("error", (error) => {
    console.error("❌ [Session Store Error Event]", error);
  });
  
  const isProduction = process.env.NODE_ENV === "production";
  const isReplitEnv = !!process.env.REPL_ID;
  
  const isCrossOriginDeployment = 
    isReplitEnv || 
    (isProduction && !!process.env.FRONTEND_URL && !!process.env.BACKEND_ONLY);
  
  const cookieConfig = {
    httpOnly: true,
    secure: false, // Changed to false for easier debugging in Replit environment
    sameSite: "lax", // Changed to lax for simpler session management
    maxAge: sessionTtl,
  } as const;

  console.log("🍪 [Session Config]");
  console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`   Cross-Origin: ${isCrossOriginDeployment ? 'YES' : 'NO'}`);
  console.log(`   Cookie sameSite: ${cookieConfig.sameSite}`);
  console.log(`   Cookie secure: ${cookieConfig.secure}`);
  if (!isCrossOriginDeployment && isProduction) {
    console.warn("⚠️  Cross-origin deployment NOT detected!");
    console.warn("   For split deployment (e.g., Vercel frontend + Railway backend):");
    console.warn("   Set these environment variables on your BACKEND (Railway):");
    console.warn("   - FRONTEND_URL=<your-actual-vercel-url> (must use HTTPS)");
    console.warn("   - BACKEND_ONLY=true");
    console.warn("   - CORS_ORIGIN=<your-actual-vercel-url>");
    console.warn("   - NODE_ENV=production");
    console.warn("   This enables sameSite=none cookies for cross-origin authentication.");
  }
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: cookieConfig as any,
  });
}

export async function setupAuth(app: Express) {
  const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (hasGoogleAuth) {
    const backendUrl = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined;
      
    const callbackURL = process.env.NODE_ENV === "production" 
      ? `${backendUrl}/api/auth/google/callback`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : `http://localhost:5000/api/auth/google/callback`;
    
    if (process.env.NODE_ENV === "production" && !backendUrl) {
      throw new Error("BACKEND_URL or RAILWAY_PUBLIC_DOMAIN must be set in production for Google OAuth callback");
    }

    console.log(`[OAuth Debug] Callback URL: ${callbackURL}`);
    console.log(`[OAuth Debug] Client ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
    console.log(`[OAuth Debug] Client Secret exists: ${!!process.env.GOOGLE_CLIENT_SECRET}`);
    console.log(`[OAuth Debug] Client Secret length: ${process.env.GOOGLE_CLIENT_SECRET?.trim().length}`);

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const firstName = profile.name?.givenName;
            const lastName = profile.name?.familyName;
            const profileImageUrl = profile.photos?.[0]?.value;

            if (!email) {
              return done(new Error("No email provided by Google"));
            }

            const user = await storage.upsertUserByGoogleId({
              googleId,
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              profileImageUrl: profileImageUrl || null,
            });

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );

  passport.serializeUser((user: any, done) => {
    console.log(`[Passport] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`[Passport] Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.warn(`[Passport] User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error(`[Passport] Deserialization error for user ${id}:`, error);
      done(error);
    }
  });

    app.get("/api/auth/google", 
      passport.authenticate("google", { 
        scope: ["profile", "email"] 
      })
    );

    app.get("/api/auth/google/callback",
      (req, res, next) => {
        passport.authenticate("google", (err: any, user: any, info: any) => {
          if (err) {
            console.error("[OAuth Error] Full error:", err);
            console.error("[OAuth Error] Error name:", err.name);
            console.error("[OAuth Error] Error message:", err.message);
            if (err.oauthError) {
              console.error("[OAuth Error] OAuth status code:", err.oauthError.statusCode);
              console.error("[OAuth Error] OAuth data:", err.oauthError.data);
            }
            return res.status(500).json({ 
              message: "Authentication failed", 
              error: err.message,
              details: err.oauthError?.data 
            });
          }
          if (!user) {
            return res.redirect(process.env.FRONTEND_URL || "/");
          }
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("[OAuth Error] Login error:", loginErr);
              return next(loginErr);
            }
            return res.redirect(process.env.FRONTEND_URL || "/");
          });
        })(req, res, next);
      }
    );
  } else {
  passport.serializeUser((user: any, done) => {
    console.log(`[Passport] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`[Passport] Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.warn(`[Passport] User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error(`[Passport] Deserialization error for user ${id}:`, error);
      done(error);
    }
  });
  }

  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Check for admin session
  if ((req.session as any).isAdmin && (req.session as any).adminToken) {
    return next();
  }
  // Check for regular authentication
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
