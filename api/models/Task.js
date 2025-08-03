const { logger } = require('@librechat/data-schemas');
const { User, Balance } = require('~/db/models');

/**
 * Get task statistics for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Task statistics object
 */
const getTaskStats = async (userId) => {
  try {
    // TODO: Implement per-user task stats
    // For now, return mock data since Task model doesn't exist yet
    // In a real implementation, this would query the Task collection
    return {
      tasks_completed: 0,
      total_earnings: 0,
      available_tasks: 1, // Mock available tasks
      pending_earnings: 0
    };
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
    // TEMPORARY: Return true for now
    return { enrolled: true, enrolledAt: new Date() };
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }

    return {
      enrolled: user.dataSharingEnrolled || false,
      enrolledAt: user.dataSharingEnrolledAt || null
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
    const user = await User.findByIdAndUpdate(
      userId,
      {
        dataSharingEnrolled: true,
        dataSharingEnrolledAt: new Date()
      },
      { new: true }
    ).lean();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      enrolled: true,
      enrolledAt: user.dataSharingEnrolledAt
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
    // TEMPORARY: IGNORE DATA SHARING FOR NOW
    // Check if user is enrolled in data sharing
    // const user = await User.findById(userId).lean();
    // if (!user || !user.dataSharingEnrolled) {
    //   throw new Error('User must be enrolled in data sharing to claim tasks');
    // }

    // For now, return a mock task since Task model doesn't exist yet
    // In a real implementation, this would query and update the Task collection
    const mockTask = {
      id: 'mock-task-1',
      type: 'ad_placement_and_description',
      title: 'Review Ad Placement',
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
        user_query: 'What are some good places to eat in San Francisco?',
        response: `## 🍽️ Top Places to Eat in San Francisco

San Francisco is a culinary paradise, offering a diverse range of dining experiences. Here are some must-visit spots, each with its own unique charm:

---

### 1. **The Ferry Building Farmers Market**
- **Description:** A vibrant marketplace featuring local farmers, artisan producers, and gourmet food stalls.
- **Why Visit:** Enjoy fresh, organic produce and sample delicious bites from some of the city's best vendors, all while taking in stunning views of the Bay Bridge.

---

### 2. **Mission Dolores Park**
- **Description:** A lively park in the heart of the Mission District, surrounded by trendy eateries and food trucks.
- **Why Visit:** Perfect for a picnic with friends or to grab a burrito from a nearby taqueria and relax on the grassy slopes with a view of the city skyline.

---

### 3. **Golden Gate Park**
- **Description:** This sprawling urban oasis is home to several hidden gems, including cozy cafes and the famous Japanese Tea Garden.
- **Why Visit:** After exploring the park’s gardens and museums, treat yourself to tea and snacks in a tranquil setting.

---

### 4. **Alcatraz Island**
- **Description:** While known for its historic prison, Alcatraz also offers unique dining experiences on the ferry and at the pier.
- **Why Visit:** Savor fresh seafood at Fisherman’s Wharf before or after your tour, and enjoy the maritime atmosphere.

---

### 5. **San Francisco Museum of Modern Art (SFMOMA)**
- **Description:** Beyond world-class art, SFMOMA boasts stylish cafes and a rooftop garden restaurant.
- **Why Visit:** Indulge in gourmet cuisine surrounded by inspiring artwork and city views.

---

> **Pro Tip:** San Francisco’s food scene is ever-evolving. Don’t hesitate to explore local neighborhoods for hidden gems and seasonal pop-ups!

Bon appétit! 😋
`,
      },
      estimated_time_minutes: 5,
      reward_amount: 0.50
    };

    return mockTask;
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
    // For now, just return success since Task model doesn't exist yet
    // In a real implementation, this would update the Task collection and add to balance
    const mockReward = 0.50;

    // Add earnings to user's balance
    if (mockReward > 0) {
      await Balance.findOneAndUpdate(
        { user: userId },
        {
          $inc: { tokenCredits: mockReward },
          $setOnInsert: { user: userId }
        },
        { upsert: true, new: true }
      );
    }

    return {
      success: true,
      task_id: taskId,
      reward_amount: mockReward
    };
  } catch (error) {
    logger.error('[Earn.submitTask] Error submitting task:', error);
    throw new Error('Failed to submit task');
  }
};

/**
 * Get user's task history
 * @param {string} userId - The user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of task objects
 */
const getUserTaskHistory = async (userId, options = {}) => {
  try {
    // For now, return empty array since Task model doesn't exist yet
    // In a real implementation, this would query the Task collection
    return [];
  } catch (error) {
    logger.error('[Earn.getUserTaskHistory] Error getting task history:', error);
    throw new Error('Failed to get task history');
  }
};

/**
 * Get available task types
 * @returns {Promise<Array>} Array of task type objects
 */
const getAvailableTaskTypes = async () => {
  try {
    return [
      {
        type: 'ad_placement_and_description',
        title: 'Ad Placement and Description',
        description: 'Review and improve ad placements and descriptions',
        estimated_time_minutes: 5,
        base_reward: 0.50
      },
      {
        type: 'ad_feedback',
        title: 'Ad Feedback',
        description: 'Provide feedback on ad quality and relevance',
        estimated_time_minutes: 3,
        base_reward: 0.30
      }
    ];
  } catch (error) {
    logger.error('[Earn.getAvailableTaskTypes] Error getting task types:', error);
    throw new Error('Failed to get task types');
  }
};

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task object
 */
const createTask = async (taskData) => {
  try {
    // For now, just return the task data since Task model doesn't exist yet
    // In a real implementation, this would create a new Task document
    return {
      ...taskData,
      id: `task-${Date.now()}`,
      status: 'available',
      created_at: new Date()
    };
  } catch (error) {
    logger.error('[Earn.createTask] Error creating task:', error);
    throw new Error('Failed to create task');
  }
};

/**
 * Update task status
 * @param {string} taskId - The task ID
 * @param {string} status - The new status
 * @param {Object} updateData - Additional data to update
 * @returns {Promise<Object>} Updated task object
 */
const updateTaskStatus = async (taskId, status, updateData = {}) => {
  try {
    // For now, just return the update data since Task model doesn't exist yet
    // In a real implementation, this would update the Task document
    return {
      id: taskId,
      status,
      ...updateData,
      updated_at: new Date()
    };
  } catch (error) {
    logger.error('[Earn.updateTaskStatus] Error updating task status:', error);
    throw new Error('Failed to update task status');
  }
};

module.exports = {
  getTaskStats,
  getDataSharingStatus,
  acceptDataSharing,
  claimAndLoadTask,
  submitTask,
  getUserTaskHistory,
  getAvailableTaskTypes,
  createTask,
  updateTaskStatus
};
