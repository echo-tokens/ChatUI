import React, { useState } from 'react';
import { cn } from '~/utils';

// TaskInfo interface matching the API response
interface TaskInfo {
  task_type: string;
  selection_method: string;
  instructions: string;
  pipelines: string[];
  outputs: {
    [pipelineName: string]: {
      contextualized_ad: string;
      ad_advertiser: string;
    };
  };
}

// Abstract Task class
abstract class Task {
  protected selection_method: string;
  protected instructions: string;
  protected taskInfo: TaskInfo;
  protected onSubmit: (result: any) => void;
  protected onClose: () => void;

  constructor(
    selection_method: string,
    instructions: string,
    taskInfo: TaskInfo,
    onSubmit: (result: any) => void,
    onClose: () => void
  ) {
    this.selection_method = selection_method;
    this.instructions = instructions;
    this.taskInfo = taskInfo;
    this.onSubmit = onSubmit;
    this.onClose = onClose;
  }

  abstract render(): React.ReactNode;
}

// TaskEvaluation concrete class
class TaskEvaluation extends Task {
  render(): React.ReactNode {
    const [selectedAds, setSelectedAds] = useState<string[]>([]);

    const handleSubmit = () => {
      if (this.selection_method === 'pick_one') {
        if (selectedAds.length > 0) {
          this.onSubmit({
            task_type: 'evaluation',
            selected_ad: selectedAds[0],
            selection_method: this.selection_method
          });
        }
      } else if (this.selection_method === 'pick_multiple') {
        this.onSubmit({
            task_type: 'evaluation',
            selected_ads: selectedAds,
            selection_method: this.selection_method
        });
      }
    };

    const handleAdSelection = (pipelineName: string) => {
      if (this.selection_method === 'pick_one') {
        setSelectedAds([pipelineName]);
      } else if (this.selection_method === 'pick_multiple') {
        setSelectedAds(prev => 
          prev.includes(pipelineName)
            ? prev.filter(ad => ad !== pipelineName)
            : [...prev, pipelineName]
        );
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {/* Instructions */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Task Instructions
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {this.instructions}
          </p>
        </div>

        {/* Ad Selection */}
        <div className="mb-6">
          <div className="space-y-3">
            {Object.entries(this.taskInfo.outputs).map(([pipelineName, output]) => (
              <div
                key={pipelineName}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  selectedAds.includes(pipelineName)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                )}
                onClick={() => handleAdSelection(pipelineName)}
              >
                {/* Selection input */}
                <input
                  type={this.selection_method === 'pick_one' ? 'radio' : 'checkbox'}
                  name={this.selection_method === 'pick_one' ? 'ad-selection' : `ad-selection-${pipelineName}`}
                  value={pipelineName}
                  checked={selectedAds.includes(pipelineName)}
                  onChange={() => handleAdSelection(pipelineName)}
                  className="mt-1 w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                
                {/* Ad content */}
                <div className="flex-1">
                  <div className="text-xs text-gray-400 dark:text-gray-400 mb-2">
                    <span className="text-gray-400 dark:text-gray-400">Ad:</span>
                    <span className="text-gray-400 dark:text-gray-400 font-bold ml-1">
                      {output.ad_advertiser}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {output.contextualized_ad}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={this.onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedAds.length === 0}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors",
              selectedAds.length > 0
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            )}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }
}

// TaskAnnotation concrete class (placeholder)
class TaskAnnotation extends Task {
  render(): React.ReactNode {
    const handleSubmit = () => {
      this.onSubmit({
        task_type: 'annotation',
        selection_method: this.selection_method
      });
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Task Instructions
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {this.instructions}
          </p>
        </div>
        
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          TaskAnnotation implementation coming soon...
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={this.onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }
}

// Factory function to create appropriate task instance
export const createTask = (
  taskInfo: TaskInfo,
  onSubmit: (result: any) => void,
  onClose: () => void
): Task => {
  switch (taskInfo.task_type) {
    case 'evaluation':
      return new TaskEvaluation(
        taskInfo.selection_method,
        taskInfo.instructions,
        taskInfo,
        onSubmit,
        onClose
      );
    case 'annotation':
      return new TaskAnnotation(
        taskInfo.selection_method,
        taskInfo.instructions,
        taskInfo,
        onSubmit,
        onClose
      );
    default:
      throw new Error(`Unknown task type: ${taskInfo.task_type}`);
  }
};

// React component wrapper
interface TaskComponentProps {
  taskInfo: TaskInfo;
  onSubmit: (result: any) => void;
  onClose: () => void;
}

export const TaskComponent: React.FC<TaskComponentProps> = ({ taskInfo, onSubmit, onClose }) => {
  const task = createTask(taskInfo, onSubmit, onClose);
  return task.render();
};

export default TaskComponent;
