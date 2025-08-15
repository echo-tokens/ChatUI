const { logger } = require('@librechat/data-schemas');
const { User } = require('~/db/models');
const { updateUser, createUser } = require('~/models');
const { supabase } = require('~/lib/supabase');
const OpenAI = require('openai');

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

    // First, get the task from the tasks table
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Get the experiment details from the experiments table
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .select('task_type, selection_method, instructions, pipeline_names')
      .eq('experiment_name', task.experiment_name)
      .single();

    if (experimentError || !experiment) {
      throw new Error('Experiment not found');
    }

    // Perform DFS search to find all "contextualized_ad" instances in the outputs tree
    // Based on AdRetrieval tree structure where nodes have 'next_node' arrays
    const contextualizedAdsFound = [];
    const adAdvertisersFound = [];
    
    const dfsSearch = (node) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      let branch_count = 0;
      // Recursively search through next_node arrays (AdRetrieval tree structure)
      if (node.next_node && Array.isArray(node.next_node)) {
        for (let index = 0; index < node.next_node.length; index++) {
          const childNode = node.next_node[index];
          branch_count += dfsSearch(childNode);
        }
      }

      // Post-order traversal to repeat contextualized_ad for children
      if (node.contextualized_ad) {
        if (!node.next_node || node.next_node.length === 0) {
          contextualizedAdsFound.push(node.contextualized_ad);
        } else {
          for (let i = 0; i < branch_count; i++) {
            contextualizedAdsFound.push(node.contextualized_ad);
          }
        }
      }
      if (node.advertiser) {
        if (!node.next_node || node.next_node.length === 0) {
          adAdvertisersFound.push(node.advertiser);
        } else {
          for (let i = 0; i < branch_count; i++) {
            adAdvertisersFound.push(node.advertiser);
          }
        }
      }
      
      return (node.next_node && Array.isArray(node.next_node)) ? node.next_node.length : 1;
    };
    
    if (task.outputs && typeof task.outputs === 'object') {
      for (let i = 0; i < task.outputs.length; i++) {
        dfsSearch(task.outputs[i]);
      }
    }
    
    // Ensure we have the same number of contextualized ads as pipeline names
    if (contextualizedAdsFound.length !== experiment.pipeline_names.length) {
      logger.warn(`[Task.getTaskInfo] Mismatch between pipeline names (${experiment.pipeline_names.length}) and contextualized ads found (${contextualizedAdsFound.length})`);
    }

    if (adAdvertisersFound.length !== experiment.pipeline_names.length) {
      logger.warn(`[Task.getTaskInfo] Mismatch between pipeline names (${experiment.pipeline_names.length}) and ad advertisers found (${adAdvertisersFound.length})`);
    }
    
    // Create outputs object mapping pipeline names to contextualized ads
    const outputs = {};
    experiment.pipeline_names.forEach((pipelineName, index) => {
      if (contextualizedAdsFound[index] && adAdvertisersFound[index]) {
        outputs[pipelineName] = {
          contextualized_ad: contextualizedAdsFound[index],
          ad_advertiser: adAdvertisersFound[index]
        };
      } else if (contextualizedAdsFound[index]) {
        outputs[pipelineName] = {
          contextualized_ad: contextualizedAdsFound[index],
          ad_advertiser: null
        };
      } else if (adAdvertisersFound[index]) {
        outputs[pipelineName] = {
          contextualized_ad: null,
          ad_advertiser: adAdvertisersFound[index]
        };
      } else {
        outputs[pipelineName] = {
          contextualized_ad: null,
          ad_advertiser: null
        };
      }
    });

    console.log(outputs);

    return {
      task_type: experiment.task_type,
      selection_method: experiment.selection_method,
      instructions: experiment.instructions,
      pipelines: experiment.pipeline_names,
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
      .from('tasks')
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

    // Get the task from the tasks table
    const { data: task, error: taskError } = await supabase
      .from('tasks')
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
