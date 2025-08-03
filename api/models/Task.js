const { logger } = require('@librechat/data-schemas');
const { User } = require('~/db/models');
const { updateUser, createUser } = require('~/models');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const MOCK = false;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get task statistics for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Task statistics object
 */
const getTaskStats = async (userId) => {
  try {
    if (MOCK) {
      return {
        tasks_completed: 0,
        total_earnings: 0,
        available_tasks: 1
      }
    }

    // query supabase for task stats
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    const { data: claimed_tasks, error: claimed_tasks_error } = await supabase.from('earn_tasks').select('*').eq('assigned_user_id', userId);
    const { data: unclaimed_tasks, error: unclaimed_tasks_error } = await supabase.from('earn_tasks').select('*').is('assigned_user_id', null);
    if (claimed_tasks_error || unclaimed_tasks_error) {
      throw new Error('Failed to get task stats');
    }

    console.log(claimed_tasks);
    console.log(unclaimed_tasks);

    const completed_tasks = claimed_tasks.filter(task => task.completed === true);
    const incomplete_tasks = claimed_tasks.filter(task => task.completed === false || task.completed === null);
    const available_tasks = unclaimed_tasks.filter(task => task.minimum_trust_level <= (user.trust_level || 0));

    return {
      tasks_completed: completed_tasks.length,
      available_tasks: incomplete_tasks.length + available_tasks.length,
      total_earnings: completed_tasks.reduce((acc, task) => acc + (task.price || 0), 0)
    }
  } catch (error) {
    logger.error('[Task.getTaskStats] Error getting task stats:', error);
    throw new Error('Failed to get task statistics');
  }
};

/**
 * Check if user is enrolled in data sharing agreement
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Data sharing status object
 */
const getDataSharingStatus = async (userId) => {
  try {
    if (MOCK) {
      return { enrolled: true, enrolledAt: new Date() };
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    return {
      enrolled: user.data_sharing_enrolled || false,
      enrolledAt: user.data_sharing_enrolled_at || null
    };
  } catch (error) {
    logger.error('[Task.getDataSharingStatus] Error checking data sharing status:', error);
    throw new Error('Failed to check data sharing status');
  }
};

/**
 * Accept data sharing agreement for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Updated user object
 */
const acceptDataSharing = async (userId) => {
  try {
    if (MOCK) {
      return {
        enrolled: true,
        enrolledAt: new Date()
      }
    }

    const user = await updateUser(userId, {
      data_sharing_enrolled: true,
      data_sharing_enrolled_at: new Date()
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.data_sharing_enrolled) {
      throw new Error('Failed to accept data sharing agreement');
    }

    return {
      enrolled: true,
      enrolledAt: user.data_sharing_enrolled_at
    };
  } catch (error) {
    logger.error('[Task.acceptDataSharing] Error accepting data sharing:', error);
    throw new Error('Failed to accept data sharing agreement');
  }
};

/**
 * Claim and load a task for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Task object
 */
const claimAndLoadTask = async (userId) => {
  try {
    if (MOCK) {
      const mockTask = {
        id: 'mock-task-1',
        type: 'ad_placement_and_description',
        title: 'Ad Placement',
        description: 'Review and improve ad placement for better user experience',
        instructions: [
          "1) Read the user query and response.",
          "2) Insert an advertisement(s) in the response below by clicking the > button (right-pointing chevron) where you think an advertisement(s) would be most appropriate.",
          "3) In each advertisement box, write a description for the type of ad that would be appropriate for that location (e.g. 'Kitchen equipment ad for woks or stir-fry pans').",
          "4) Click submit.",
          "",
          "Some guidelines:",
          "- Prioritize user experience by only inserting ads that are relevant to the user's goal/intent.",
          "- Ads should be for products or services someone would primarily purchase online (i.e. not groceries).",
          "- Do not place more than one or two ads in one response.",
          "- If no ads are appropriate, submit without inserting any ads.",
          "- Only place ads AFTER (not before) the relevant line(s) in the response. For example, if the response mentions a wok, the line after a mention of the wok would be a good place to insert an ad for a wok.",
        ].join('\n'),
        data: {
          user_query: "What are some good places to eat in San Francisco?",
          response: "## 🍽️ Top Places to Eat in San Francisco\n\nSan Francisco is a culinary paradise, offering a diverse range of dining experiences. Here are some must-visit spots, each with its own unique charm:\n\n---\n\n### 1. **The Ferry Building Farmers Market**\n- **Description:** A vibrant marketplace featuring local farmers, artisan producers, and gourmet food stalls.\n- **Why Visit:** Enjoy fresh, organic produce and sample delicious bites from some of the city's best vendors, all while taking in stunning views of the Bay Bridge.\n\n---\n\n### 2. **Mission Dolores Park**\n- **Description:** A lively park in the heart of the Mission District, surrounded by trendy eateries and food trucks.\n- **Why Visit:** Perfect for a picnic with friends or to grab a burrito from a nearby taqueria and relax on the grassy slopes with a view of the city skyline.\n\n---\n\n### 3. **Golden Gate Park**\n- **Description:** This sprawling urban oasis is home to several hidden gems, including cozy cafes and the famous Japanese Tea Garden.\n- **Why Visit:** After exploring the park's gardens and museums, treat yourself to tea and snacks in a tranquil setting.\n\n---\n\n### 4. **Alcatraz Island**\n- **Description:** While known for its historic prison, Alcatraz also offers unique dining experiences on the ferry and at the pier.\n- **Why Visit:** Savor fresh seafood at Fisherman's Wharf before or after your tour, and enjoy the maritime atmosphere.\n\n---\n\n### 5. **San Francisco Museum of Modern Art (SFMOMA)**\n- **Description:** Beyond world-class art, SFMOMA boasts stylish cafes and a rooftop garden restaurant.\n- **Why Visit:** Indulge in gourmet cuisine surrounded by inspiring artwork and city views.\n\n---\n\n> **Pro Tip:** San Francisco's food scene is ever-evolving. Don't hesitate to explore local neighborhoods for hidden gems and seasonal pop-ups!\n\nBon appétit! 😋\n"
        },
        estimated_time_minutes: 5,
        reward_amount: 0.50
      };

      return mockTask;
    }

    const user = await User.findById(userId).lean();
    
    // Load any incomplete tasks that the user already claimed
    const { data: incompleteTasks, error: incompleteTasksError } = await supabase
      .from('earn_tasks')
      .select('*')
      .eq('assigned_user_id', userId)
      .not('completed', 'is', true);

    if (incompleteTasksError) {
      throw new Error('Failed to load incomplete tasks');
    }

    if (incompleteTasks && incompleteTasks.length > 0) {
      // Return the first incomplete task (or you could return all, depending on requirements)
      console.log(incompleteTasks[0]);
      return formatTaskResponse(incompleteTasks[0]);
    }

    // Load a new task if no incomplete tasks are found
    const { data: unclaimed_tasks, error: unclaimed_tasks_error } = await supabase.from('earn_tasks').select('*').is('assigned_user_id', null);
    if (unclaimed_tasks_error) {
      throw new Error('Failed to get unclaimed tasks');
    }

    const sorted_by_trust_level = unclaimed_tasks.filter(task => task.minimum_trust_level <= (user.trust_level || 0)).sort((a, b) => a.minimum_trust_level - b.minimum_trust_level);

    if (sorted_by_trust_level.length > 0) {
      await supabase.from('earn_tasks').update({ assigned_user_id: userId, user_assigned_timestamp: new Date(), completed: false }).eq('id', sorted_by_trust_level[0].id);
      return formatTaskResponse(sorted_by_trust_level[0]);
    }
    // return nothing if no tasks are available
    populateAdPlacementAndDescriptionTasks(100);
  } catch (error) {
    logger.error('[Earn.claimAndLoadTask] Error claiming task:', error);
    throw error;
  }
};

/**
 * Submit a task response
 * @param {string} userId - The user ID
 * @param {string} taskId - The task ID
 * @param {Object} response - The task response
 * @returns {Promise<Object>} Submission result
 */
const submitTask = async (userId, taskId, response) => {
  try {
    if (MOCK) {
      return {
        success: true,
        task_id: taskId,
        reward_amount: 0.50
      }
    }

    // Update task status to completed
    const { data: task, error: task_error } = await supabase.from('earn_tasks').update({ completed: true, user_response: response }).eq('id', taskId);
    if (task_error) {
      throw new Error('Failed to update task status');
    }

    return { success: true };
  } catch (error) {
    logger.error('[Earn.submitTask] Error submitting task:', error);
    throw new Error('Failed to submit task');
  }
};


const formatTaskResponse = (task) => {
  const task_types = getAvailableTaskTypes();
  const task_type = task_types[task.task_type];
  return {
    id: task.id,
    task_type: task.task_type,
    task_title: task_type.task_title,
    description: task_type.description,
    instructions: task_type.instructions,
    estimated_time_minutes: task.estimated_time_minutes,
    reward_amount: task.price,
    data: task.task_info,
    minimum_trust_level: task.minimum_trust_level
  }
}

/**
 * Get available task types
 * @returns {Dictionary} Dictionary of task type objects
 */
const getAvailableTaskTypes = () => {
  try {
    return {
      'ad_placement_and_description': {
        task_type: 'ad_placement_and_description',
        task_title: 'Ad Placement and Description',
        description: 'Review and improve ad placements and descriptions',
        instructions: [
          "1) Read the user query and response.",
          "2) Insert an advertisement(s) in the response below by clicking the > button (right-pointing chevron) where you think an advertisement(s) would be most appropriate.",
          "3) In each advertisement box, write a description for the type of ad that would be appropriate for that location (e.g. 'Kitchen equipment ad for woks or stir-fry pans').",
          "4) Click submit.",
          "",
          "Some guidelines:",
          "- Prioritize user experience by only inserting ads that are relevant to the user's goal/intent.",
          "- Ads should be for products or services someone would primarily purchase online (i.e. not groceries).",
          "- Do not place more than one or two ads in one response.",
          "- If no ads are appropriate, submit without inserting any ads.",
          "- Only place ads AFTER (not before) the relevant line(s) in the response. For example, if the response mentions a wok, the line after a mention of the wok would be a good place to insert an ad for a wok.",
        ].join('\n')
      }
    };
  } catch (error) {
    logger.error('[Earn.getAvailableTaskTypes] Error getting task types:', error);
    throw new Error('Failed to get task types');
  }
};


const llmGenerateAdPlacementAndDescriptionTask = async () => {
  console.log("Generating prompt...");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an assistant that generates example prompts a user might ask a chatbot." },
      { role: "user", content: "Generate a single example prompt a user might ask a chatbot. Choose specific topics, and speak in a way a user might speak to a chatbot. Write prompts that range from 1 to 4 sentences in length and have varying writing styles and specificity. For example, a gamer might ask about why a lower latency monitor is important for gaming, while an athlete may describe in detail the symptoms of an injury they sustained. Take on various roles and ask specific questions. Only output the prompt, nothing else." }
    ],
    max_tokens: 200,
    n: 1,
    temperature: 0.8,
    seed: Math.floor(Math.random() * 1000000) + 1
  });
  
  const examplePrompt = response.choices[0].message.content.trim();
  console.log("Prompt generated: ", examplePrompt);
  
  const response2 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: examplePrompt }
    ],
    max_tokens: 1000,
    n: 1,
    temperature: 0.8,
    seed: Math.floor(Math.random() * 1000000) + 1
  });
  
  const exampleResponse = response2.choices[0].message.content.trim();
  console.log("Response generated: ", exampleResponse);
  
  return { prompt: examplePrompt, response: exampleResponse };
};

const addAdPlacementAndDescriptionTaskToDatabase = async (user_query, response, estimated_time_minutes, price, minimum_trust_level) => {
  try {
    const task = await supabase.from('earn_tasks').insert({
      task_type: 'ad_placement_and_description',
      completed: false,
      task_info: {
        user_query: user_query,
        response: response
      },
      estimated_time_minutes: estimated_time_minutes,
      price: price,
      minimum_trust_level: minimum_trust_level
    }).select().single();

    return task;
  } catch (error) {
    logger.error('[Task.createAdPlacementAndDescriptionTask] Error creating task:', error);
    throw new Error('Failed to create ad placement and description task');
  }
};

const populateAdPlacementAndDescriptionTasks = async (num_tasks) => {
  try {
    for (let i = 0; i < num_tasks; i++) {
      const promptResponsePair = await llmGenerateAdPlacementAndDescriptionTask();
      await addAdPlacementAndDescriptionTaskToDatabase(promptResponsePair.prompt, promptResponsePair.response, 3, 0.50, 0);
    }
  } catch (error) {
    logger.error('[Task.populateAdPlacementAndDescriptionTasks] Error populating ad placement and description tasks:', error);
    throw new Error('Failed to populate ad placement and description tasks');
  }
};

module.exports = {
  getTaskStats,
  getDataSharingStatus,
  acceptDataSharing,
  claimAndLoadTask,
  submitTask,
  getAvailableTaskTypes
};
