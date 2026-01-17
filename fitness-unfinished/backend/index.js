const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// Configure CORS properly
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-scan-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
    }
  }
});

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "fitness_db"
});

db.connect(err => {
  if (err) {
    console.error("MySQL Connection Error:", err);
    process.exit(1);
  }
  console.log("MySQL Connected");
});

// Extended food database for better recognition
const enhancedFoodDatabase = {
  weight_loss: [
    { id: 1, name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 0.4, category: "dairy", icon: "fa-mortar-pestle", keywords: ["yogurt", "greek", "dairy"] },
    { id: 2, name: "Grilled Chicken Breast", calories: 165, protein: 31, carbs: 0, fat: 3.6, category: "protein", icon: "fa-drumstick-bite", keywords: ["chicken", "grilled", "breast", "poultry"] },
    { id: 3, name: "Steamed Broccoli", calories: 55, protein: 4, carbs: 11, fat: 0.6, category: "vegetable", icon: "fa-carrot", keywords: ["broccoli", "vegetable", "green", "steamed"] },
    { id: 4, name: "Salmon", calories: 206, protein: 22, carbs: 0, fat: 13, category: "protein", icon: "fa-fish", keywords: ["salmon", "fish", "seafood"] },
    { id: 5, name: "Quinoa Bowl", calories: 220, protein: 8, carbs: 39, fat: 4, category: "grain", icon: "fa-seedling", keywords: ["quinoa", "grain", "bowl", "healthy"] },
    { id: 6, name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, category: "fruit", icon: "fa-apple-alt", keywords: ["apple", "fruit", "red", "green"] },
    { id: 7, name: "Mixed Greens Salad", calories: 50, protein: 3, carbs: 10, fat: 2, category: "vegetable", icon: "fa-leaf", keywords: ["salad", "greens", "vegetable", "lettuce"] },
    { id: 8, name: "Avocado", calories: 160, protein: 2, carbs: 9, fat: 15, category: "fruit", icon: "fa-leaf", keywords: ["avocado", "fruit", "green", "healthy fat"] }
  ],
  muscle_gain: [
    { id: 9, name: "Protein Shake", calories: 150, protein: 30, carbs: 5, fat: 2, category: "supplement", icon: "fa-blender", keywords: ["protein", "shake", "supplement", "drink"] },
    { id: 10, name: "Brown Rice with Chicken", calories: 450, protein: 40, carbs: 45, fat: 8, category: "meal", icon: "fa-utensils", keywords: ["rice", "chicken", "meal", "brown rice"] },
    { id: 11, name: "Eggs (3 whole)", calories: 215, protein: 19, carbs: 1, fat: 15, category: "protein", icon: "fa-egg", keywords: ["eggs", "egg", "breakfast", "protein"] },
    { id: 12, name: "Lean Beef Steak", calories: 250, protein: 26, carbs: 0, fat: 15, category: "protein", icon: "fa-drumstick-bite", keywords: ["beef", "steak", "meat", "protein"] },
    { id: 13, name: "Sweet Potato", calories: 112, protein: 2, carbs: 26, fat: 0, category: "vegetable", icon: "fa-carrot", keywords: ["sweet potato", "potato", "vegetable", "orange"] },
    { id: 14, name: "Cottage Cheese", calories: 120, protein: 14, carbs: 4, fat: 5, category: "dairy", icon: "fa-cheese", keywords: ["cottage cheese", "cheese", "dairy", "protein"] }
  ],
  maintenance: [
    { id: 15, name: "Avocado Toast", calories: 250, protein: 8, carbs: 30, fat: 12, category: "meal", icon: "fa-bread-slice", keywords: ["avocado", "toast", "bread", "breakfast"] },
    { id: 16, name: "Tuna Salad", calories: 180, protein: 20, carbs: 5, fat: 9, category: "protein", icon: "fa-fish", keywords: ["tuna", "salad", "fish", "seafood"] },
    { id: 17, name: "Oatmeal", calories: 150, protein: 5, carbs: 27, fat: 3, category: "grain", icon: "fa-seedling", keywords: ["oatmeal", "oats", "breakfast", "grain"] },
    { id: 18, name: "Mixed Nuts", calories: 170, protein: 5, carbs: 6, fat: 15, category: "snack", icon: "fa-cookie-bite", keywords: ["nuts", "mixed nuts", "snack", "healthy fat"] },
    { id: 19, name: "Vegetable Soup", calories: 120, protein: 4, carbs: 20, fat: 3, category: "soup", icon: "fa-bowl-food", keywords: ["soup", "vegetable soup", "broth", "warm"] },
    { id: 20, name: "Whole Wheat Pasta", calories: 200, protein: 7, carbs: 40, fat: 1, category: "grain", icon: "fa-utensils", keywords: ["pasta", "whole wheat", "noodles", "italian"] }
  ]
};

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "NutriTrack API is running",
    version: "1.0.0",
    endpoints: {
      nutriscan: "/api/nutriscan/analyze (POST)",
      food_suggestions: "/food-suggestions/:goal (GET)",
      user_data: "/user/:user_id (GET)",
      recommendations: "/recommendations/:user_id (GET)"
    }
  });
});

// GET USER GOALS
app.get("/user/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(`Fetching user data for ID: ${user_id}`);
  
  const sql = "SELECT id, goal, daily_calories FROM users WHERE id = ?";
  
  db.query(sql, [user_id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }
    
    console.log("User found:", result[0]);
    res.json({
      success: true,
      data: result[0]
    });
  });
});

// NUTRI SCAN AI - MAIN ENDPOINT
app.post("/api/nutriscan/analyze", upload.single('image'), async (req, res) => {
  console.log("=== NutriScan Analysis Request ===");
  console.log("Headers:", req.headers);
  console.log("Body fields:", req.body);
  console.log("File:", req.file);
  
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ 
        success: false, 
        error: "No image file uploaded. Please select an image." 
      });
    }

    const { user_id, user_goal } = req.body;
    console.log(`Received: user_id=${user_id}, user_goal=${user_goal}`);
    
    // Validate required fields
    if (!user_id) {
      console.error("Missing user_id");
      return res.status(400).json({ 
        success: false, 
        error: "User ID is required" 
      });
    }

    let goal = user_goal;
    
    // If goal not provided, fetch from database
    if (!goal) {
      console.log("Fetching goal from database for user:", user_id);
      const userSql = "SELECT goal FROM users WHERE id = ?";
      db.query(userSql, [user_id], (err, result) => {
        if (err || result.length === 0) {
          console.log("Using default goal: maintenance");
          goal = 'maintenance';
        } else {
          goal = result[0].goal;
          console.log("Found goal in DB:", goal);
        }
        
        // Process the food analysis
        const analysisResult = analyzeFoodImage(req.file, goal, user_id);
        console.log("Analysis complete:", analysisResult.data.food.name);
        
        res.json(analysisResult);
      });
    } else {
      console.log("Using provided goal:", goal);
      const analysisResult = analyzeFoodImage(req.file, goal, user_id);
      console.log("Analysis complete:", analysisResult.data.food.name);
      
      res.json(analysisResult);
    }
    
  } catch (error) {
    console.error("NutriScan analysis error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to analyze image. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Food analysis logic
function analyzeFoodImage(file, goal, userId) {
  console.log(`Analyzing food image for goal: ${goal}, user: ${userId}`);
  console.log(`File: ${file.filename}, Size: ${file.size} bytes`);
  
  // Get foods for the user's goal
  const goalFoods = enhancedFoodDatabase[goal] || enhancedFoodDatabase.maintenance;
  const allFoods = Object.values(enhancedFoodDatabase).flat();
  
  // Simulate more advanced image analysis
  const analysisResult = simulateAdvancedFoodRecognition(file, goalFoods, allFoods);
  
  return {
    success: true,
    data: {
      food: analysisResult.food,
      analysis: {
        confidence: analysisResult.confidence,
        processing_time: (Math.random() * 0.5 + 1.5).toFixed(2), // 1.5-2.0 seconds
        image_id: file.filename,
        image_url: `/uploads/${file.filename}`,
        timestamp: new Date().toISOString(),
        algorithm: "NutriScan AI v1.0"
      },
      alternatives: getAlternativeSuggestions(analysisResult.food, goalFoods),
      recommendations: getFoodRecommendations(analysisResult.food, goal)
    }
  };
}

function simulateAdvancedFoodRecognition(file, goalFoods, allFoods) {
  const filename = file.filename.toLowerCase();
  const timeOfDay = new Date().getHours();
  let matchedFood = null;
  let confidence = 85 + Math.floor(Math.random() * 15); // 85-99%
  
  // More sophisticated keyword matching
  const keywordMatches = [];
  
  // Check each food for keyword matches
  allFoods.forEach(food => {
    food.keywords.forEach(keyword => {
      if (filename.includes(keyword)) {
        keywordMatches.push({ food, score: 1 });
      }
    });
  });
  
  // If we found keyword matches, use the first one
  if (keywordMatches.length > 0) {
    matchedFood = keywordMatches[0].food;
    confidence = Math.min(99, confidence + 5); // Boost confidence for keyword match
  }
  
  // If no keyword match, select based on time of day and goal
  if (!matchedFood) {
    let filteredFoods = goalFoods;
    
    // Time-based filtering
    if (timeOfDay >= 6 && timeOfDay < 11) {
      // Breakfast foods
      filteredFoods = filteredFoods.filter(f => 
        ['dairy', 'fruit', 'grain', 'meal'].includes(f.category));
    } else if (timeOfDay >= 11 && timeOfDay < 16) {
      // Lunch foods
      filteredFoods = filteredFoods.filter(f => 
        ['protein', 'meal', 'vegetable'].includes(f.category));
    } else if (timeOfDay >= 16 && timeOfDay < 22) {
      // Dinner foods
      filteredFoods = filteredFoods.filter(f => 
        ['protein', 'meal', 'vegetable'].includes(f.category));
    } else {
      // Late night snacks
      filteredFoods = filteredFoods.filter(f => 
        ['fruit', 'snack', 'dairy'].includes(f.category));
    }
    
    // If filtered list is empty, use all goal foods
    if (filteredFoods.length === 0) {
      filteredFoods = goalFoods;
    }
    
    // Random selection from filtered list
    const randomIndex = Math.floor(Math.random() * filteredFoods.length);
    matchedFood = filteredFoods[randomIndex];
  }
  
  // Add realistic variance
  const variance = 0.85 + Math.random() * 0.3; // 0.85-1.15
  
  return {
    food: {
      ...matchedFood,
      calories: Math.round(matchedFood.calories * variance),
      protein: parseFloat((matchedFood.protein * variance).toFixed(1)),
      carbs: parseFloat((matchedFood.carbs * variance).toFixed(1)),
      fat: parseFloat((matchedFood.fat * variance).toFixed(1)),
      estimated_portion: getEstimatedPortion(matchedFood.category),
      meal_suggestion: getMealSuggestion(timeOfDay)
    },
    confidence
  };
}

function getEstimatedPortion(category) {
  const portions = {
    protein: "150-200g",
    vegetable: "1 cup",
    fruit: "1 medium piece",
    dairy: "200g",
    grain: "1 cup cooked",
    meal: "1 serving",
    snack: "1 handful",
    supplement: "1 serving",
    soup: "1 bowl"
  };
  return portions[category] || "1 serving";
}

function getMealSuggestion(hour) {
  if (hour >= 6 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 22) return "Dinner";
  return "Late Night Snack";
}

function getAlternativeSuggestions(mainFood, goalFoods) {
  // Get foods from same category
  const sameCategory = goalFoods.filter(f => 
    f.category === mainFood.category && f.id !== mainFood.id
  );
  
  // Get foods with similar calorie range (±50 calories)
  const similarCalories = goalFoods.filter(f => 
    Math.abs(f.calories - mainFood.calories) < 50 && f.id !== mainFood.id
  );
  
  // Combine and deduplicate
  const alternatives = [...sameCategory, ...similarCalories];
  const uniqueAlternatives = [];
  const seenIds = new Set([mainFood.id]);
  
  for (const alt of alternatives) {
    if (!seenIds.has(alt.id)) {
      seenIds.add(alt.id);
      uniqueAlternatives.push({
        ...alt,
        reason: alt.category === mainFood.category ? 
          `Similar ${alt.category} option` : 
          `Similar calorie count (${alt.calories} cal)`
      });
    }
    
    if (uniqueAlternatives.length >= 3) break;
  }
  
  return uniqueAlternatives;
}

function getFoodRecommendations(food, goal) {
  const recommendations = [];
  
  if (goal === "weight_loss") {
    if (food.calories > 300) {
      recommendations.push("Consider a smaller portion for weight loss");
    }
    if (food.protein < 20) {
      recommendations.push("Add a protein source to stay full longer");
    }
  } else if (goal === "muscle_gain") {
    if (food.protein < 25) {
      recommendations.push("Great for muscle growth - high in protein");
    }
    if (food.calories < 300) {
      recommendations.push("Consider adding a side for extra calories");
    }
  }
  
  // General recommendations
  if (food.fat > 15) {
    recommendations.push("Contains healthy fats - great for satiety");
  }
  if (food.category === "vegetable" || food.category === "fruit") {
    recommendations.push("Rich in vitamins and fiber");
  }
  
  return recommendations.length > 0 ? recommendations : ["Balanced choice for your goals"];
}

// GET FOOD SUGGESTIONS
app.get("/food-suggestions/:goal", (req, res) => {
  const { goal } = req.params;
  console.log(`Fetching food suggestions for goal: ${goal}`);
  
  const suggestions = enhancedFoodDatabase[goal] || enhancedFoodDatabase.maintenance;
  
  res.json({
    success: true,
    data: suggestions.map(food => ({
      id: food.id,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      category: food.category,
      icon: food.icon,
      keywords: food.keywords
    })),
    count: suggestions.length,
    goal: goal
  });
});

// LOG SCANNED FOOD
app.post("/api/food/log", (req, res) => {
  console.log("Logging food:", req.body);
  
  const {
    user_id,
    food_name,
    calories,
    protein,
    carbs,
    fat,
    meal_type,
    log_date,
    log_time,
    scanned,
    confidence
  } = req.body;
  
  if (!user_id || !food_name || calories === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: user_id, food_name, and calories are required" 
    });
  }
  
  const sql = `
    INSERT INTO food_logs 
    (user_id, food_name, calories, protein, carbs, fat, meal_type, log_date, log_time, scanned, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    user_id,
    food_name,
    calories,
    protein || 0,
    carbs || 0,
    fat || 0,
    meal_type || 'lunch',
    log_date || new Date().toISOString().split('T')[0],
    log_time || new Date().toLocaleTimeString('en-US', { hour12: true }),
    scanned ? 1 : 0,
    confidence || '85%'
  ];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log("Food logged successfully, ID:", result.insertId);
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        message: "Food logged successfully",
        scanned: scanned || false,
        timestamp: new Date().toISOString()
      }
    });
  });
});

// Keep all your existing endpoints...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
});