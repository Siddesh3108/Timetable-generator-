import tensorflow as tf
class TimetableModel(tf.keras.Model):
    def __init__(self, input_shape, num_constraints):
        super().__init__()
        self.encoder = tf.keras.Sequential([
            tf.keras.layers.Dense(256, activation='relu', input_shape=(input_shape[1],)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2)
        ])
        self.constraint_branches = [
            tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dense(32, activation='relu')
            ]) for _ in range(num_constraints)
        ]
        self.decoder = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dense(input_shape[1], activation='sigmoid')
        ])
    def call(self, inputs):
        encoded = self.encoder(inputs)
        encoded = tf.clip_by_value(encoded, -10, 10)
        constraint_outputs = []
        for branch in self.constraint_branches:
            output = branch(encoded)
            output = tf.clip_by_value(output, -5, 5)
            constraint_outputs.append(output)
        merged = tf.concat(constraint_outputs, axis=-1)
        output = self.decoder(merged)
        return tf.clip_by_value(output, 1e-7, 1 - 1e-7)
    def compute_loss(self, predictions, targets):
        reconstruction_loss = tf.reduce_mean(
            tf.keras.losses.binary_crossentropy(targets, predictions)
        )
        constraint_loss = 0
        for branch in self.constraint_branches:
            for layer in branch.layers:
                if hasattr(layer, 'kernel'):
                    constraint_loss += tf.reduce_sum(tf.abs(layer.kernel))
        return reconstruction_loss + 0.01 * constraint_loss
