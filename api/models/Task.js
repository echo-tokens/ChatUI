const { logger } = require('@librechat/data-schemas');
const { User } = require('~/db/models');
const { updateUser, createUser } = require('~/models');
const { supabase } = require('~/lib/supabase');
const OpenAI = require('openai');

// Get table names from environment variables
const TASKS_TABLE = process.env.TASKS_TABLE || 'tasks_new';
const EXPERIMENTS_TABLE = process.env.EXPERIMENTS_TABLE || 'experiments_new';
const AD_GEN_LOGS_TABLE = process.env.AD_GEN_LOGS_TABLE || 'ad_gen_logs';

const MOCK = false;

/**
 * Get task information including experiment details and outputs
 * @param {string} taskId - The task ID
 * @param {string} userId - The user ID for verification
 * @returns {Promise<Object>} Task information object
 */
const getTaskInfo = async (taskId, userId) => {
  try {
    if (MOCK) {
      return {
        task_type: 'comparison',
        selection_method: 'random',
        instructions: 'Compare the following ads and select the best one.',
        pipelines: ['pipeline1', 'pipeline2'],
        outputs: {
          pipeline1: { contextualized_ad: 'Sample ad 1' },
          pipeline2: { contextualized_ad: 'Sample ad 2' }
        }
      };
    }

    // First, get the task from the tasks_new table
    const { data: task, error: taskError } = await supabase
      .from(TASKS_TABLE)
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Get the experiment details from the experiments_new table
    const { data: experiment, error: experimentError } = await supabase
      .from(EXPERIMENTS_TABLE)
      .select('*')
      .eq('experiment_name', task.experiment_name)
      .single();

    if (experimentError || !experiment) {
      throw new Error('Experiment not found');
    }

    // Since tasks_new no longer stores outputs, we need to get ad data from the ad_gen_logs table
    // using the ad_gen_id from the task
    const { data: adGenLog, error: adGenError } = await supabase
      .from(AD_GEN_LOGS_TABLE)
      .select('*')
      .eq('id', task.ad_gen_id)
      .single();

    if (adGenError) {
      logger.warn(`[Task.getTaskInfo] Could not find ad generation log for task ${taskId}:`, adGenError);
    }

    // For now, create empty outputs object - this would need to be enhanced 
    // to retrieve the actual ad data that was generated for this task
    const pipelineNames = experiment.pipelines || [];
    const outputs = {};
    
    // TODO: In the future, this should retrieve the actual ads that were generated
    // for this specific task from the ad_gen_logs or a separate ads table
    pipelineNames.forEach((pipelineName, index) => {
      outputs[pipelineName] = {
        contextualized_ad: `Ad content for ${pipelineName} (Task ID: ${taskId})`,
        ad_advertiser: 'Sample Advertiser'
      };
    });

    console.log('Task outputs (placeholder):', outputs);

    return {
      task_type: experiment.task_type,
      ui_display: experiment.ui_display,
      selection_method: experiment.task_type, // In new format, task_type is the selection method
      instructions: experiment.instructions,
      pipelines: experiment.pipelines, // Updated field name
      outputs: outputs
    };
  } catch (error) {
    logger.error('[Task.getTaskInfo] Error getting task info:', error);
    throw new Error('Failed to get task information');
  }
};

/**
 * Submit task result from AdTile component
 * @param {string} taskId - The task ID
 * @param {Object} result - The task result object
 * @returns {Promise<Object>} Submission result
 */
const submitTask = async (taskId, result) => {
  try {
    if (MOCK) {
      return {
        success: true,
        message: 'Task result submitted successfully',
        taskId: taskId
      };
    }

    // Store the task result in the database
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .update({ 
        user_submission: result,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select();

    if (error) {
      logger.error('[Task.submitTask] Database error:', error);
      throw new Error('Failed to submit task result');
    }

    if (!data || data.length === 0) {
      throw new Error('Task not found');
    }

    return { 
      success: true, 
      message: 'Task result submitted successfully',
      taskId: taskId
    };
  } catch (error) {
    logger.error('[Task.submitTask] Error submitting task:', error);
    throw new Error('Failed to submit task result');
  }
};



/**
 * Check if a task has been completed
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Completion status object
 */
const checkTaskCompletion = async (taskId) => {
  try {
    if (MOCK) {
      return {
        completed: false,
        user_submission: null
      };
    }

    // Get the task from the tasks_new table
    const { data: task, error: taskError } = await supabase
      .from(TASKS_TABLE)
      .select('user_submission, completed_at')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    const completed = !!(task.user_submission && task.completed_at);
    
    return {
      completed,
      user_submission: task.user_submission
    };
  } catch (error) {
    logger.error('[Task.checkTaskCompletion] Error checking task completion:', error);
    throw new Error('Failed to check task completion');
  }
};

module.exports = {
  submitTask,
  getTaskInfo,
  checkTaskCompletion
};
