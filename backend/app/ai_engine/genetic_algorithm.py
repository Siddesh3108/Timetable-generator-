import numpy as np
import logging
import tensorflow as tf

logger = logging.getLogger(__name__)

class GeneticOptimizer:
    def __init__(self, pop_size=50, generations=30):
        self.pop_size = pop_size
        self.generations = generations

    def optimize(self, model, input_data, constraint_manager):
        population = [model.get_weights() for _ in range(self.pop_size)]
        
        for gen in range(self.generations):
            fitness_scores = [self.fitness_function(model, w, input_data, constraint_manager) for w in population]
            
            elite_count = max(2, int(self.pop_size * 0.1))
            elite_indices = np.argsort(fitness_scores)[-elite_count:]
            new_population = [population[i] for i in elite_indices]
            
            while len(new_population) < self.pop_size:
                parent1_idx = self._tournament_selection(fitness_scores)
                parent2_idx = self._tournament_selection(fitness_scores)
                child = self._crossover(population[parent1_idx], population[parent2_idx])
                child = self._mutate(child)
                new_population.append(child)
            
            population = new_population
            if (gen + 1) % 5 == 0 or gen == 0:
                logger.info(f"GA Generation {gen+1}/{self.generations}: Best fitness = {max(fitness_scores):.4f}")
        
        best_idx = np.argmax([self.fitness_function(model, w, input_data, constraint_manager) for w in population])
        return population[best_idx]

    def _tournament_selection(self, fitness_scores, tournament_size=3):
        candidates_idx = np.random.choice(len(fitness_scores), tournament_size, replace=False)
        best_candidate_local_idx = np.argmax([fitness_scores[i] for i in candidates_idx])
        return candidates_idx[best_candidate_local_idx]

    def fitness_function(self, model, weights, input_data, constraint_manager):
        # --- THIS IS THE CORRECTED LOGIC ---
        # The overly broad try/except block is removed to ensure errors are not silenced.
        model.set_weights(weights)
        predictions = model(input_data)
        
        # Now, decoding must succeed for a fitness score to be calculated.
        timetable_grid, raw_events = constraint_manager.decode_timetable(predictions.numpy())
        metrics = constraint_manager.evaluate_timetable(raw_events)
        
        # Fitness is now a simple calculation based on conflict avoidance.
        fitness = 100 - (metrics.get('conflicts', 100) * 10)
        return fitness

    def _crossover(self, w1, w2, rate=0.8):
        child = []
        for i in range(len(w1)):
            if np.random.rand() < rate:
                child.append((w1[i] + w2[i]) / 2)
            else:
                child.append(w1[i] if np.random.rand() < 0.5 else w2[i])
        return child
    
    def _mutate(self, weights, rate=0.05, magnitude=0.1):
        mutated_weights = []
        for w in weights:
            if np.random.rand() < rate:
                mutation = np.random.normal(0, magnitude, w.shape)
                mutated_weights.append(w + mutation.astype(w.dtype))
            else:
                mutated_weights.append(w)
        return mutated_weights
