
<h1>
    Read 1 Billion Rows challenge
</h1>


## Table of Contents

- [Introduction](#introduction)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Benchmarks](#benchmarks)

## Introduction

This project is a challenge to read 1 billion rows from a CSV file and process them in a reasonable time. The project is written in Javascript and uses the Deno runtime.

The CSV file used in this project is a 14GB file with 1 billion rows. Each row has 2 columns: `station` and `temperature`. The goal is to read the file and calculate the minimum, maximum, and average temperature for each station. 

Currently, the project is able to read the file and calculate the minimum, maximum, and average temperature for each station in about 2.1 minutes on 12-thread CPU. 

My current implementation use a single thread to calculate every chunk of the file. The file is divided into the number of threads available in the CPU. Each thread reads stream data from the file and calculates the minimum, maximum, and average temperature for each station. The results are then merged into a single object.

To improve the performance i use the following strategies:
- Multithreading: The file is divided into the number of threads available in the CPU.
- Stream processing: The file is read in chunks and processed in parallel by each thread to avoid memory issues.
- Map Object: The results are stored in a Map object to make it faster to access the data.
- Custom float parser: The default float parser in Javascript is slow. I created a custom float to int parser to improve the performance.


you can find the original challenge [here](https://github.com/gunnarmorling/1brc).

This proposal is a work in progress and will be improved in the future. 🚀. 

